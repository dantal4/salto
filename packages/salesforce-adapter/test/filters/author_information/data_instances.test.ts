/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { CORE_ANNOTATIONS, ElemID, Element, ObjectType, InstanceElement } from '@salto-io/adapter-api'
import { MockInterface } from '@salto-io/test-utils'
import { FileProperties } from '@salto-io/jsforce-types'
import { mockFileProperties, mockQueryResult } from '../../connection'
import mockClient from '../../client'
import Connection from '../../../src/client/jsforce'
import SalesforceClient from '../../../src/client/client'
import { Filter, FilterResult } from '../../../src/filter'
import dataInstances from '../../../src/filters/author_information/data_instances'
import { defaultFilterContext } from '../../utils'
import { API_NAME, CUSTOM_OBJECT, METADATA_TYPE } from '../../../src/constants'

describe('data instances author information test', () => {
  let filter: Filter
  let client: SalesforceClient
  let connection: MockInterface<Connection>
  let testInst: InstanceElement
  const testType = new ObjectType({
    elemID: new ElemID('', 'test'),
    annotations: { [METADATA_TYPE]: CUSTOM_OBJECT, [API_NAME]: 'otherName' },
  })
  const objectProperties = mockFileProperties({
    fullName: 'Custom__c',
    type: 'test',
    createdByName: 'created_name',
    createdDate: 'created_date',
    lastModifiedByName: 'changed_name',
    lastModifiedDate: 'changed_date',
  })
  const TestCustomRecords = mockQueryResult({
    records: [
      {
        Id: 'creator_id',
        Name: 'created_name',
      },
      {
        Id: 'changed_id',
        Name: 'changed_name',
      },
    ],
    totalSize: 2,
  })
  const checkElementAnnotations = (object: Element, properties: FileProperties): void => {
    expect(object.annotations[CORE_ANNOTATIONS.CREATED_BY]).toEqual(properties.createdByName)
    expect(object.annotations[CORE_ANNOTATIONS.CREATED_AT]).toEqual(properties.createdDate)
    expect(object.annotations[CORE_ANNOTATIONS.CHANGED_BY]).toEqual(properties.lastModifiedByName)
    expect(object.annotations[CORE_ANNOTATIONS.CHANGED_AT]).toEqual(properties.lastModifiedDate)
  }
  beforeEach(async () => {
    ;({ connection, client } = mockClient())
    testInst = new InstanceElement('Custom__c', testType, {
      CreatedDate: 'created_date',
      CreatedById: 'creator_id',
      LastModifiedDate: 'changed_date',
      LastModifiedById: 'changed_id',
    })
    filter = dataInstances({ client, config: defaultFilterContext })
  })
  describe('success', () => {
    beforeEach(async () => {
      connection.query.mockResolvedValue(TestCustomRecords)
      await filter.onFetch?.([testInst])
    })
    it('should add annotations to to custom object instances', async () => {
      checkElementAnnotations(testInst, objectProperties)
    })
  })
  describe('failure', () => {
    it('should return a warning', async () => {
      connection.query.mockImplementation(() => {
        throw new Error()
      })
      const res = (await filter.onFetch?.([testInst])) as FilterResult
      const err = res.errors ?? []
      expect(res.errors).toHaveLength(1)
      expect(err[0]).toEqual({
        severity: 'Warning',
        message: 'Other issues',
        detailedMessage:
          'Encountered an error while trying to populate author information in some of the Salesforce configuration elements.',
      })
    })
  })
})
