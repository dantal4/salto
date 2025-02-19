/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ElemID, InstanceElement, ObjectType, toChange } from '@salto-io/adapter-api'
import { AUTOMATION_ORDER_TYPE_NAME, ZENDESK } from '../../src/constants'
import { emptyAutomationOrderValidator } from '../../src/change_validators/empty_automation_order'

describe('emptyVariantsValidator', () => {
  const itemType = new ObjectType({
    elemID: new ElemID(ZENDESK, AUTOMATION_ORDER_TYPE_NAME),
    isSettings: true,
  })
  const item = new InstanceElement('automationOrder', itemType, { name: 'test1', active: [], inactive: [] })
  it('should return an error for an empty automation order', async () => {
    const errors = await emptyAutomationOrderValidator([toChange({ after: item })])
    expect(errors).toEqual([
      {
        elemID: item.elemID,
        severity: 'Error',
        message: 'Cannot make this change due to empty automation order',
        detailedMessage: 'Automation order must have at least one active or inactive item',
      },
    ])
  })
  it('should not return an error when we remove an item', async () => {
    const errors = await emptyAutomationOrderValidator([toChange({ before: item })])
    expect(errors).toHaveLength(0)
  })
  it('should not return an error when there are active items', async () => {
    const clonedItem = item.clone()
    clonedItem.value.active = ['active_item']
    const errors = await emptyAutomationOrderValidator([toChange({ after: clonedItem })])
    expect(errors).toHaveLength(0)
  })
  it('should not return an error when there are inactive items', async () => {
    const clonedItem = item.clone()
    clonedItem.value.inactive = ['inactive_item']
    const errors = await emptyAutomationOrderValidator([toChange({ after: clonedItem })])
    expect(errors).toHaveLength(0)
  })
  it('should not return an error when there are active and inactive items', async () => {
    const clonedItem = item.clone()
    clonedItem.value.active = ['active_item']
    clonedItem.value.inactive = ['inactive_item']
    const errors = await emptyAutomationOrderValidator([toChange({ after: clonedItem })])
    expect(errors).toHaveLength(0)
  })
})
