import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/test'
process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters'

const { pool } = await import('../src/config/database.js')
const {
  createGroup,
  deleteGroup,
  updateGroup,
} = await import('../src/services/master/group.service.js')
const { createSubgroup, deleteSubgroup, updateSubgroup } =
  await import('../src/services/master/subgroup.service.js')
const { createBrand, deleteBrand, updateBrand } =
  await import('../src/services/master/brand.service.js')
const { createTax, deleteTax, updateTax } =
  await import('../src/services/master/tax.service.js')

function fakeClient(responses) {
  const statements = []
  const parameters = []
  return {
    statements,
    parameters,
    async query(sql, values) {
      statements.push(sql)
      parameters.push(values)
      const response = responses.shift()
      if (!response) throw new Error(`Unexpected query: ${sql}`)
      return response
    },
    release() {},
  }
}

test('group creation records its creator and writes an audit log', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ groupId: 7, groupName: 'Group7', statusId: 1, recordFlag: 0 }] },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)

  const group = await createGroup(1, 3, 'Group7')

  assert.equal(group.groupId, 7)
  assert.match(client.statements[1], /gr_maker_id/)
  assert.deepEqual(client.parameters[1], [1, 'Group7', 3])
  assert.match(client.statements[2], /INSERT INTO tbl_userlog/)
  assert.equal(client.parameters[2][1], 3)
  assert.ok(client.statements.includes('COMMIT'))
})

test('group deletion is rejected when any subgroup is mapped', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ group_id: 7 }] },
    { rows: [{ hasSubgroups: true }] },
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)

  await assert.rejects(deleteGroup(1, 3, 7), { code: 'GROUP_HAS_SUBGROUPS' })
  assert.ok(client.statements.includes('ROLLBACK'))
  assert.ok(!client.statements.some((sql) => sql.includes('DELETE FROM mr_group')))
})

test('group deactivation is rejected when any subgroup is mapped', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ groupId: 7, statusId: 1 }] },
    { rows: [{ hasSubgroups: true }] },
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)

  await assert.rejects(
    updateGroup(1, 3, 7, { groupName: 'Group7', statusId: 0 }),
    { code: 'GROUP_HAS_SUBGROUPS' },
  )
  assert.ok(!client.statements.some((sql) => sql.includes('UPDATE mr_group')))
})

test('group deletion marks an unmapped group as removed', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ group_id: 7 }] },
    { rows: [{ hasSubgroups: false }] },
    { rowCount: 1 },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)

  assert.equal(await deleteGroup(1, 3, 7), true)
  assert.ok(client.statements.some(
    (sql) => sql.includes('UPDATE mr_group') && sql.includes('SET gr_delflag = 1'),
  ))
  assert.match(client.statements[1], /gr_delflag = 0/)
  assert.match(client.statements[4], /INSERT INTO tbl_userlog/)
  assert.ok(client.statements.includes('COMMIT'))
})

test('group updates record the modifier and write an audit log', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ groupId: 7, statusId: 1 }] },
    { rows: [{ groupId: 7, groupName: 'NewName', statusId: 1, recordFlag: 1 }] },
    { rows: [{ subgroupCount: 0 }] },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)

  const group = await updateGroup(1, 3, 7, { groupName: 'NewName' })

  assert.equal(group.groupName, 'NewName')
  assert.doesNotMatch(client.statements[2], /gr_muid|gr_uid/)
  assert.match(client.statements[4], /INSERT INTO tbl_userlog/)
  assert.ok(client.statements.includes('COMMIT'))
})

test('subgroup deletion marks the row as removed', async (t) => {
  const client = fakeClient([
    {},
    { rowCount: 1 },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)

  assert.equal(await deleteSubgroup(1, 3, 9), true)
  assert.match(client.statements[1], /UPDATE mr_subgroup/)
  assert.match(client.statements[1], /SET sg_delflag = 1/)
  assert.match(client.statements[1], /sg_delflag = 0/)
  assert.match(client.statements[2], /INSERT INTO tbl_userlog/)
})

test('subgroup updates write an audit log', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ subgroupId: 9 }] },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)
  t.mock.method(pool, 'query', async () => ({
    rows: [{ subgroupId: 9, subgroupName: 'NewName', groupId: 7, groupName: 'Group7' }],
  }))

  const subgroup = await updateSubgroup(
    1,
    3,
    9,
    { groupId: 7, subgroupName: 'NewName' },
  )

  assert.equal(subgroup.subgroupName, 'NewName')
  assert.doesNotMatch(client.statements[1], /sg_muid|sg_uid/)
  assert.match(client.statements[2], /INSERT INTO tbl_userlog/)
  assert.equal(client.parameters[2][1], 3)
})

test('subgroup creation locks its parent group before inserting', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ gr_id: 7 }] },
    { rows: [{ subgroupId: 9 }] },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)
  t.mock.method(pool, 'query', async () => ({
    rows: [{
      subgroupId: 9,
      subgroupName: 'Group9',
      groupId: 7,
      groupName: 'Group7',
      statusId: 1,
    }],
  }))

  const subgroup = await createSubgroup(1, 3, { groupId: 7, subgroupName: 'Group9' })
  assert.equal(subgroup.subgroupId, 9)
  assert.match(client.statements[1], /FOR UPDATE/)
  assert.match(client.statements[2], /INSERT INTO mr_subgroup/)
  assert.deepEqual(client.parameters[2], [1, 7, 'Group9', 3])
  assert.match(client.statements[3], /INSERT INTO tbl_userlog/)
  assert.equal(client.parameters[3][1], 3)
})

test('brand creation records its maker and writes an audit log', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ brandId: 11 }] },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)
  t.mock.method(pool, 'query', async () => ({
    rows: [{ brandId: 11, brandName: 'Brand12', makerId: 3, statusId: 1, recordFlag: 0 }],
  }))

  const brand = await createBrand(1, 3, 'Brand12')

  assert.equal(brand.brandId, 11)
  assert.match(client.statements[1], /br_maker_id/)
  assert.deepEqual(client.parameters[1], [1, 'Brand12', 3])
  assert.match(client.statements[2], /INSERT INTO tbl_userlog/)
  assert.equal(client.parameters[2][1], 3)
})

test('brand updates and soft deletion each write an audit log', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ brandId: 11 }] },
    {},
    {},
    {},
    { rowCount: 1 },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)
  t.mock.method(pool, 'query', async () => ({
    rows: [{ brandId: 11, brandName: 'Updated12', makerId: 3, statusId: 0, recordFlag: 0 }],
  }))

  await updateBrand(1, 3, 11, { brandName: 'Updated12', statusId: 0 })
  assert.match(client.statements[2], /INSERT INTO tbl_userlog/)
  assert.ok(client.statements.includes('COMMIT'))
  assert.equal(await deleteBrand(1, 3, 11), true)
  assert.match(client.statements[6], /INSERT INTO tbl_userlog/)
  assert.match(client.statements[5], /SET br_delflag = 1/)
})

test('tax creation records its maker and writes an audit log', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ taxId: 15 }] },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)
  t.mock.method(pool, 'query', async () => ({
    rows: [{ taxId: 15, taxPercentage: 2, makerId: 3, statusId: 1, recordFlag: 0 }],
  }))

  const tax = await createTax(1, 3, 2)

  assert.equal(tax.taxPercentage, 2)
  assert.match(client.statements[1], /tx_maker_id/)
  assert.deepEqual(client.parameters[1], [1, 2, 3])
  assert.match(client.statements[2], /INSERT INTO tbl_userlog/)
  assert.equal(client.parameters[2][1], 3)
})

test('tax updates and soft deletion each write an audit log', async (t) => {
  const client = fakeClient([
    {},
    { rows: [{ taxId: 15 }] },
    {},
    {},
    {},
    { rowCount: 1 },
    {},
    {},
  ])
  t.mock.method(pool, 'connect', async () => client)
  t.mock.method(pool, 'query', async () => ({
    rows: [{ taxId: 15, taxPercentage: 2, makerId: 3, statusId: 0, recordFlag: 0 }],
  }))

  await updateTax(1, 3, 15, { taxPercentage: 2, statusId: 0 })
  assert.match(client.statements[2], /INSERT INTO tbl_userlog/)
  assert.equal(await deleteTax(1, 3, 15), true)
  assert.match(client.statements[6], /INSERT INTO tbl_userlog/)
  assert.match(client.statements[5], /SET tx_delflag = 1/)
})
