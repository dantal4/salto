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
import { BuiltinTypes, ElemID, InstanceElement, ObjectType, ProgressReporter, ReferenceExpression, toChange } from '@salto-io/adapter-api'
import { NetsuiteQuery } from '../../src/query'
import safeDeployValidator, { FetchByQueryReturnType } from '../../src/change_validators/safe_deploy'
import { PATH, NETSUITE } from '../../src/constants'
import { IDENTIFIER_FIELD } from '../../src/data_elements/types'
import { customlistType } from '../../src/autogen/types/custom_types/customlist'
import { customrecordtypeType } from '../../src/autogen/types/custom_types/customrecordtype'
import { customsegmentType } from '../../src/autogen/types/custom_types/customsegment'
import { roleType } from '../../src/autogen/types/custom_types/role'
import { fileType, folderType } from '../../src/types/file_cabinet_types'

describe('safe deploy change validator', () => {
  const customlist = customlistType().type
  describe('custom instances', () => {
    const origInstance = new InstanceElement(
      'instance',
      customlist,
      {
        customvalues: {
          customvalue: [
            {
              scriptid: 'val_1',
              value: 'Value 1',
            },
            {
              scriptid: 'val_2',
              value: 'Value 2',
            },
          ],
        },
      },
    )
    const origInstance1 = new InstanceElement(
      'instance1',
      customlist,
      {
        customvalues: {
          customvalue: [
            {
              scriptid: 'val_1',
              value: 'Value 1',
            },
            {
              scriptid: 'val_2',
              value: 'Value 2',
            },
          ],
        },
      },
    )

    const origInstance2 = new InstanceElement(
      'instance',
      customrecordtypeType().type,
      {
        customvalues: {
          customvalue: [
            {
              scriptid: 'val_1',
              value: 'Value 1',
            },
            {
              scriptid: 'val_2',
              value: 'Value 2',
            },
          ],
        },
      },
    )

    let afterInstance: InstanceElement
    beforeEach(() => {
      afterInstance = origInstance.clone()
      afterInstance.value.customvalues.customvalue[0].value = 'Value 1!@!'
    })

    describe('Modification changes', () => {
      describe('When the instance has not changed in the service', () => {
        it('should have no change warning', async () => {
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [origInstance.clone(), origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
      })

      describe('When the instance has changed in the service in the same field', () => {
        it('should have warning', async () => {
          const serviceInstance = origInstance.clone()
          serviceInstance.value.customvalues.customvalue[0].value = 'Changed Value'

          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [serviceInstance.clone(), origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })
      })

      describe('When the instance has changed in the service in a different field', () => {
        it('should have warning', async () => {
          const serviceInstance = origInstance.clone()
          serviceInstance.value.customvalues.customvalue[1].value = 'Changed Value'
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [serviceInstance.clone(), origInstance1, origInstance2],
          }))

          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })
      })

      describe('When the instance has changed in the service in the same way it changed in the workspace', () => {
        it('should not have warning', async () => {
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [afterInstance.clone(), origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
      })

      describe('When cannot match instance in service', () => {
        it('should have warning when instance was deleted in the servie', async () => {
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [origInstance1, origInstance2],
          }))

          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })
      })
    })

    describe('Removal changes', () => {
      it('should have warning when instance has changed in the service', async () => {
        const serviceInstance = origInstance.clone()
        serviceInstance.value.customvalues.customvalue[1].value = 'Changed Value'

        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [serviceInstance.clone(), origInstance1, origInstance2],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ before: origInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(1)
      })

      it('should not have warning when instance has not changed in the service', async () => {
        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [origInstance.clone(), origInstance1, origInstance2],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ before: origInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(0)
      })
    })
    describe('Addition Changes', () => {
      it('should not have warning when instance was added in the service but values are the same', async () => {
        const newInstance = origInstance.clone()
        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [newInstance.clone()],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ after: newInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(0)
      })
      it('should have warning when instance was added in the service with modified value', async () => {
        const newInstance = origInstance.clone()
        const newInstanceModified = afterInstance.clone()
        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [newInstanceModified],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ after: newInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(1)
      })
      it('should not have warning when instance has not been added in the service', async () => {
        const newInstance = origInstance.clone()
        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ after: newInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(0)
      })
    })
    describe('Changes in referenced instances', () => {
      const customRecordInstance = new InstanceElement(
        'customrecord_cseg1',
        customrecordtypeType().type,
        {
          scriptid: 'customrecord_cseg1',
          customsegment: 'cseg1',
          value: 'Value',
        },
      )

      const customSegmentInstance = new InstanceElement(
        'cseg1',
        customsegmentType().type,
        {
          scriptid: 'cseg1',
          recordtype: 'customrecord_cseg1',
          value: 'Value',
          permissions: {
            permission: [
              {
                role: 'role1',
              },
            ],
          },
        },
      )

      const roleInstance = new InstanceElement(
        'role1',
        roleType().type,
        {
          scriptid: 'role1',
          value: 'Value',
        }
      )

      customRecordInstance.value.customsegment = new ReferenceExpression(
        customSegmentInstance.elemID.createNestedID('scriptid'),
        undefined,
        customSegmentInstance
      )
      customSegmentInstance.value.recordtype = new ReferenceExpression(
        customRecordInstance.elemID.createNestedID('scriptid'),
        undefined,
        customRecordInstance
      )
      customSegmentInstance.value.permissions.permission[0].role = new ReferenceExpression(
        roleInstance.elemID.createNestedID('scriptid'),
        undefined,
        roleInstance
      )

      let afterCustomRecordInstance: InstanceElement
      beforeEach(() => {
        afterCustomRecordInstance = customRecordInstance.clone()
        afterCustomRecordInstance.value.value = 'Changed Value'
      })

      it('should have a warning when required instance changed in the service', async () => {
        const serviceRequiredInstance = customSegmentInstance.clone()
        serviceRequiredInstance.value.value = 'Changed Value'

        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [customRecordInstance.clone(), serviceRequiredInstance, roleInstance.clone()],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ before: customRecordInstance, after: afterCustomRecordInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(1)
        expect(changeErrors[0].detailedMessage).toEqual(`The element ${customSegmentInstance.elemID.getFullName()}, which is required in ${customRecordInstance.elemID.name} and going to be deployed with it, has recently changed in the service.`)
      })
      it('should have a warning when referenced instance changed in the service', async () => {
        const serviceReferencedInstance = roleInstance.clone()
        serviceReferencedInstance.value.value = 'Changed Value'

        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [
            customRecordInstance.clone(),
            customSegmentInstance.clone(),
            serviceReferencedInstance,
          ],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ before: customRecordInstance, after: afterCustomRecordInstance })],
          fetchByQuery,
          true
        )
        expect(changeErrors).toHaveLength(1)
        expect(changeErrors[0].detailedMessage).toEqual(`The element ${roleInstance.elemID.getFullName()}, which is referenced in ${customRecordInstance.elemID.name} and going to be deployed with it, has recently changed in the service.`)
      })
    })
  })
  describe('data instances', () => {
    const accountType = new ObjectType({
      elemID: new ElemID(NETSUITE, 'Account'),
      fields: { [IDENTIFIER_FIELD]: { refType: BuiltinTypes.STRING } },
      annotations: { source: 'soap' },
    })
    const origInstance = new InstanceElement(
      'origInstance',
      accountType,
      {
        [IDENTIFIER_FIELD]: 'someValue',
        customvalues: {
          customvalue: [
            {
              scriptid: 'val_1',
              value: 'Value 1',
            },
            {
              scriptid: 'val_2',
              value: 'Value 2',
            },
          ],
        },
      },
      undefined,
      { source: 'soap' },
    )
    const origInstance1 = new InstanceElement(
      'origInstance1',
      accountType,
      {
        [IDENTIFIER_FIELD]: 'bloop',
        customvalues: {
          customvalue: [
            {
              scriptid: 'val_1',
              value: 'Value 1',
            },
            {
              scriptid: 'val_2',
              value: 'Value 2',
            },
          ],
        },
      },
      undefined,
      { source: 'soap' },
    )

    const origInstance2 = new InstanceElement(
      'origInstance2',
      accountType,
      {
        [IDENTIFIER_FIELD]: 'bla',
        customvalues: {
          customvalue: [
            {
              scriptid: 'val_1',
              value: 'Value 1',
            },
            {
              scriptid: 'val_2',
              value: 'Value 2',
            },
          ],
        },
      },
      undefined,
      { source: 'soap' },
    )

    let afterInstance: InstanceElement
    beforeEach(() => {
      afterInstance = origInstance.clone()
      afterInstance.value.customvalues.customvalue[0].value = 'Value 1!@!'
    })

    describe('Modification changes', () => {
      describe('When the instance has not changed in the service', () => {
        it('should have no change warning', async () => {
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [origInstance.clone(), origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
      })

      describe('When the instance has changed in the service in the same field', () => {
        it('should have warning', async () => {
          const serviceInstance = origInstance.clone()
          serviceInstance.value.customvalues.customvalue[0].value = 'Changed Value'

          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [serviceInstance.clone(), origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })
      })

      describe('When the instance has changed in the service in a different field', () => {
        it('should have warning', async () => {
          const serviceInstance = origInstance.clone()
          serviceInstance.value.customvalues.customvalue[1].value = 'Changed Value'
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [serviceInstance.clone(), origInstance1, origInstance2],
          }))

          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })
      })

      describe('When the instance has changed in the service in the same way it changed in the workspace', () => {
        it('should not have warning', async () => {
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [afterInstance.clone(), origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
      })

      describe('When cannot match instance in service', () => {
        it('should have warning when instance was deleted in the servie', async () => {
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [origInstance1, origInstance2],
          }))

          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance, after: afterInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })
      })
    })

    describe('Removal changes', () => {
      it('should have warning when instance has changed in the service', async () => {
        const serviceInstance = origInstance.clone()
        serviceInstance.value.customvalues.customvalue[1].value = 'Changed Value'

        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [serviceInstance.clone(), origInstance1, origInstance2],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ before: origInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(1)
      })

      it('should not have warning when instance has not changed in the service', async () => {
        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [origInstance.clone(), origInstance1, origInstance2],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ before: origInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(0)
      })
    })
    describe('Addition Changes', () => {
      it('should not have warning when instance was added in the service but values are the same', async () => {
        const newInstance = origInstance.clone()
        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [newInstance.clone()],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ after: newInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(0)
      })
      it('should have warning when instance was added in the service with modified value', async () => {
        const newInstance = origInstance.clone()
        const newInstanceModified = afterInstance.clone()
        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [newInstanceModified],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ after: newInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(1)
      })
      it('should not have warning when instance has not been added in the service', async () => {
        const newInstance = origInstance.clone()
        const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
        Promise<FetchByQueryReturnType> => (Promise.resolve({
          failedToFetchAllAtOnce: false,
          failedFilePaths: { lockedError: [], otherError: [] },
          failedTypes: { lockedError: {}, unexpectedError: {} },
          elements: [],
        }))
        const changeErrors = await safeDeployValidator(
          [toChange({ after: newInstance })],
          fetchByQuery
        )
        expect(changeErrors).toHaveLength(0)
      })
    })
  })
  describe('fileCabinet instances', () => {
    describe('file', () => {
      let afterInstance: InstanceElement
      let origInstance: InstanceElement
      let origInstance1: InstanceElement
      let origInstance2: InstanceElement
      beforeEach(() => {
        const file = fileType()
        origInstance = new InstanceElement('fileInstance', file, {
          [PATH]: 'Templates/E-mail Templates/Inner EmailTemplates Folder/content.html',
          bundleable: false,
          description: 'a',
        })
        afterInstance = origInstance.clone()
        afterInstance.value.description = 'b'

        origInstance1 = new InstanceElement('fileInstance1', file, {
          [PATH]: 'Templates/E-mail Templates/Inner EmailTemplates Folder/content.html',
          bundleable: false,
        })
        origInstance2 = new InstanceElement('fileInstance2', file, {
          [PATH]: 'Templates/E-mail Templates/Inner EmailTemplates Folder/content.html',
          bundleable: false,
        })
      })

      describe('Modification changes', () => {
        describe('When the instance has not changed in the service', () => {
          it('should have no change warning', async () => {
            const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
              failedToFetchAllAtOnce: false,
              failedFilePaths: { lockedError: [], otherError: [] },
              failedTypes: { lockedError: {}, unexpectedError: {} },
              elements: [origInstance, origInstance1, origInstance2],
            }))
            const changeErrors = await safeDeployValidator(
              [toChange({ before: origInstance, after: afterInstance })],
              fetchByQuery
            )
            expect(changeErrors).toHaveLength(0)
          })
        })

        describe('When the instance has changed in the service in the same field', () => {
          it('should have warning', async () => {
            const serviceInstance = origInstance.clone()
            serviceInstance.value.description = 'c'

            const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
              Promise<FetchByQueryReturnType> => (Promise.resolve({
              failedToFetchAllAtOnce: false,
              failedFilePaths: { lockedError: [], otherError: [] },
              failedTypes: { lockedError: {}, unexpectedError: {} },
              elements: [serviceInstance, origInstance1, origInstance2],
            }))
            const changeErrors = await safeDeployValidator(
              [toChange({ before: origInstance, after: afterInstance })],
              fetchByQuery
            )
            expect(changeErrors).toHaveLength(1)
          })
        })

        describe('When the instance has changed in the service in the same way it changed in the workspace', () => {
          it('should not have warning', async () => {
            const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
              Promise<FetchByQueryReturnType> => (Promise.resolve({
              failedToFetchAllAtOnce: false,
              failedFilePaths: { lockedError: [], otherError: [] },
              failedTypes: { lockedError: {}, unexpectedError: {} },
              elements: [afterInstance, origInstance1, origInstance2],
            }))
            const changeErrors = await safeDeployValidator(
              [toChange({ before: origInstance, after: afterInstance })],
              fetchByQuery
            )
            expect(changeErrors).toHaveLength(0)
          })
        })

        describe('When cannot match instance in service', () => {
          it('should have warning when instance was deleted in the servie', async () => {
            const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
              Promise<FetchByQueryReturnType> => (Promise.resolve({
              failedToFetchAllAtOnce: false,
              failedFilePaths: { lockedError: [], otherError: [] },
              failedTypes: { lockedError: {}, unexpectedError: {} },
              elements: [origInstance1, origInstance2],
            }))

            const changeErrors = await safeDeployValidator(
              [toChange({ before: origInstance, after: afterInstance })],
              fetchByQuery
            )
            expect(changeErrors).toHaveLength(1)
          })
        })
      })

      describe('Removal changes', () => {
        it('should have warning when instance has changed in the service', async () => {
          const serviceInstance = origInstance.clone()
          serviceInstance.value.description = 'Changed Value'

          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [serviceInstance, origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })

        it('should not have warning when instance has not changed in the service', async () => {
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [origInstance, origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
      })
      describe('Addition Changes', () => {
        it('should not have warning when instance was added in the service but values are the same', async () => {
          const newInstance = origInstance.clone()
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [newInstance.clone()],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ after: newInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
        it('should have warning when instance was added in the service with modified value', async () => {
          const newInstance = origInstance.clone()
          const newInstanceModified = afterInstance.clone()
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [newInstanceModified],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ after: newInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })
        it('should not have warning when instance has not been added in the service', async () => {
          const newInstance = origInstance.clone()
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ after: newInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
      })
    })


    describe('folder', () => {
      let afterInstance: InstanceElement
      let origInstance: InstanceElement
      let origInstance1: InstanceElement
      let origInstance2: InstanceElement
      beforeEach(() => {
        const folder = folderType()
        origInstance = new InstanceElement('folderInstance', folder, {
          [PATH]: 'Templates/E-mail Templates/Inner EmailTemplates Folder',
          description: 'a',
        })
        afterInstance = origInstance.clone()
        afterInstance.value.description = 'b'
        origInstance1 = new InstanceElement('folderInstance1', folder, {
          [PATH]: 'Templates/E-mail Templates/Inner EmailTemplates Folder',
        })
        origInstance2 = new InstanceElement('folderInstance2', folder, {
          [PATH]: 'Templates/E-mail Templates/Inner EmailTemplates Folder',
        })
      })

      describe('Modification changes', () => {
        describe('When the instance has not changed in the service', () => {
          it('should have no change warning', async () => {
            const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
            Promise<FetchByQueryReturnType> => (Promise.resolve({
              failedToFetchAllAtOnce: false,
              failedFilePaths: { lockedError: [], otherError: [] },
              failedTypes: { lockedError: {}, unexpectedError: {} },
              elements: [origInstance, origInstance1, origInstance2],
            }))
            const changeErrors = await safeDeployValidator(
              [toChange({ before: origInstance, after: afterInstance })],
              fetchByQuery
            )
            expect(changeErrors).toHaveLength(0)
          })
        })

        describe('When the instance has changed in the service in the same field', () => {
          it('should have warning', async () => {
            const serviceInstance = origInstance.clone()
            serviceInstance.value.description = 'c'

            const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
              Promise<FetchByQueryReturnType> => (Promise.resolve({
              failedToFetchAllAtOnce: false,
              failedFilePaths: { lockedError: [], otherError: [] },
              failedTypes: { lockedError: {}, unexpectedError: {} },
              elements: [serviceInstance, origInstance1, origInstance2],
            }))
            const changeErrors = await safeDeployValidator(
              [toChange({ before: origInstance, after: afterInstance })],
              fetchByQuery
            )
            expect(changeErrors).toHaveLength(1)
          })
        })

        describe('When the instance has changed in the service in the same way it changed in the workspace', () => {
          it('should not have warning', async () => {
            const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
              Promise<FetchByQueryReturnType> => (Promise.resolve({
              failedToFetchAllAtOnce: false,
              failedFilePaths: { lockedError: [], otherError: [] },
              failedTypes: { lockedError: {}, unexpectedError: {} },
              elements: [afterInstance, origInstance1, origInstance2],
            }))
            const changeErrors = await safeDeployValidator(
              [toChange({ before: origInstance, after: afterInstance })],
              fetchByQuery
            )
            expect(changeErrors).toHaveLength(0)
          })
        })

        describe('When cannot match instance in service', () => {
          it('should have warning when instance was deleted in the servie', async () => {
            const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
              Promise<FetchByQueryReturnType> => (Promise.resolve({
              failedToFetchAllAtOnce: false,
              failedFilePaths: { lockedError: [], otherError: [] },
              failedTypes: { lockedError: {}, unexpectedError: {} },
              elements: [origInstance1, origInstance2],
            }))

            const changeErrors = await safeDeployValidator(
              [toChange({ before: origInstance, after: afterInstance })],
              fetchByQuery
            )
            expect(changeErrors).toHaveLength(1)
          })
        })
      })

      describe('Removal changes', () => {
        it('should have warning when instance has changed in the service', async () => {
          const serviceInstance = origInstance.clone()
          serviceInstance.value.description = 'Changed Value'

          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [serviceInstance, origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })

        it('should not have warning when instance has not changed in the service', async () => {
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [origInstance, origInstance1, origInstance2],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ before: origInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
      })
      describe('Addition Changes', () => {
        it('should not have warning when instance was added in the service but values are the same', async () => {
          const newInstance = origInstance.clone()
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [newInstance.clone()],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ after: newInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
        it('should have warning when instance was added in the service with modified value', async () => {
          const newInstance = origInstance.clone()
          const newInstanceModified = afterInstance.clone()
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [newInstanceModified],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ after: newInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(1)
        })
        it('should not have warning when instance has not been added in the service', async () => {
          const newInstance = origInstance.clone()
          const fetchByQuery = (_query: NetsuiteQuery, _progressReporter: ProgressReporter):
          Promise<FetchByQueryReturnType> => (Promise.resolve({
            failedToFetchAllAtOnce: false,
            failedFilePaths: { lockedError: [], otherError: [] },
            failedTypes: { lockedError: {}, unexpectedError: {} },
            elements: [],
          }))
          const changeErrors = await safeDeployValidator(
            [toChange({ after: newInstance })],
            fetchByQuery
          )
          expect(changeErrors).toHaveLength(0)
        })
      })
    })
  })
})
