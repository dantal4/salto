/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { filterUtils, elements as adapterElements } from '@salto-io/adapter-components'
import _ from 'lodash'
import { InstanceElement, ReferenceExpression } from '@salto-io/adapter-api'
import { getDefaultConfig } from '../../src/config/config'
import addJsmTypesAsFieldsFilter from '../../src/filters/add_jsm_types_as_fields'
import { createEmptyType, getFilterParams } from '../utils'
import { CUSTOMER_PERMISSIONS_TYPE, JIRA, PROJECT_TYPE } from '../../src/constants'

describe('addJsmTypesAsFieldsFilter', () => {
  type FilterType = filterUtils.FilterWith<'deploy' | 'onFetch'>
  let filter: FilterType
  const projectType = createEmptyType(PROJECT_TYPE)
  let projectInstance: InstanceElement
  const customerPermissionsType = createEmptyType(CUSTOMER_PERMISSIONS_TYPE)
  let customerPermissionsInstance: InstanceElement

  beforeEach(() => {
    const config = _.cloneDeep(getDefaultConfig({ isDataCenter: false }))
    config.fetch.enableJSM = true
    filter = addJsmTypesAsFieldsFilter(getFilterParams({ config })) as typeof filter
    projectInstance = new InstanceElement(
      'project1',
      projectType,
      {
        id: 11111,
        name: 'project1',
        projectTypeKey: 'service_desk',
      },
      [JIRA, adapterElements.RECORDS_PATH, PROJECT_TYPE, 'project1'],
    )
  })
  describe('on fetch', () => {
    beforeEach(async () => {
      customerPermissionsInstance = new InstanceElement('customerPermissions1', customerPermissionsType, {
        projectKey: new ReferenceExpression(projectInstance.elemID, projectInstance),
        manageEnabled: false,
        autocompleteEnabled: false,
        serviceDeskOpenAccess: true,
      })
    })
    it('should add customerPermissions field to project instance', async () => {
      await filter.onFetch([projectInstance, customerPermissionsInstance])
      expect(projectInstance.value.customerPermissions).toEqual({
        manageEnabled: false,
        autocompleteEnabled: false,
        serviceDeskOpenAccess: true,
      })
    })
    it('should not add customerPermissions field to project instance if enableJSM is false', async () => {
      const config = _.cloneDeep(getDefaultConfig({ isDataCenter: false }))
      config.fetch.enableJSM = false
      filter = addJsmTypesAsFieldsFilter(getFilterParams({ config })) as typeof filter
      await filter.onFetch([projectInstance, customerPermissionsInstance])
      expect(projectInstance.value.customerPermissions).toBeUndefined()
    })
    it('should not add customerPermissions field to project instance if project instance is undefined', async () => {
      const elements = [projectInstance, customerPermissionsInstance]
      const config = _.cloneDeep(getDefaultConfig({ isDataCenter: false }))
      config.fetch.enableJSM = true
      customerPermissionsInstance.value.projectKey.value = undefined
      filter = addJsmTypesAsFieldsFilter(getFilterParams({ config })) as typeof filter
      await filter.onFetch(elements)
      expect(elements.find(e => e.elemID.typeName === CUSTOMER_PERMISSIONS_TYPE)).toBeUndefined()
    })
  })
})
