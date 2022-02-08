/*
*                      Copyright 2022 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
import { CORE_ANNOTATIONS, InstanceElement, Element } from '@salto-io/adapter-api'
import { buildElementsSourceFromElements } from '@salto-io/adapter-utils'
import { fileType } from '../../src/types/file_cabinet_types'
import NetsuiteClient from '../../src/client/client'
import serviceUrls from '../../src/filters/service_urls'

describe('serviceUrls', () => {
  const getPathInternalIdMock = jest.fn()
  const isSuiteAppConfiguredMock = jest.fn()
  const client = {
    getPathInternalId: getPathInternalIdMock,
    isSuiteAppConfigured: isSuiteAppConfiguredMock,
    url: 'https://accountid.app.netsuite.com',
  } as unknown as NetsuiteClient

  let elements: Element[]

  beforeEach(() => {
    jest.resetAllMocks()
    getPathInternalIdMock.mockResolvedValue(1)
    isSuiteAppConfiguredMock.mockReturnValue(true)
    elements = [
      new InstanceElement('A', fileType(), { path: '/path/A' }),
    ]
  })

  it('should set the right url', async () => {
    await serviceUrls({
      client,
      elementsSourceIndex: { getIndexes: () => Promise.resolve({
        serviceIdsIndex: {},
        serviceIdRecordsIndex: {},
        internalIdsIndex: {},
        customFieldsIndex: {},
      }) },
      elementsSource: buildElementsSourceFromElements([]),
      isPartial: false,
    }).onFetch?.(elements)
    expect(elements[0].annotations[CORE_ANNOTATIONS.SERVICE_URL]).toBe('https://accountid.app.netsuite.com/app/common/media/mediaitem.nl?id=1')
  })
  it('should do nothing if Salto SuiteApp is not configured', async () => {
    isSuiteAppConfiguredMock.mockReturnValue(false)
    await serviceUrls({
      client,
      elementsSourceIndex: { getIndexes: () => Promise.resolve({
        serviceIdsIndex: {},
        serviceIdRecordsIndex: {},
        internalIdsIndex: {},
        customFieldsIndex: {},
      }) },
      elementsSource: buildElementsSourceFromElements([]),
      isPartial: false,
    }).onFetch?.(elements)
    expect(elements[0].annotations[CORE_ANNOTATIONS.SERVICE_URL]).toBeUndefined()
  })
})
