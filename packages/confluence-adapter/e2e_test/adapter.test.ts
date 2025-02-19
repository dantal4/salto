/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import _ from 'lodash'
import {
  Change,
  DeployResult,
  Element,
  InstanceElement,
  ObjectType,
  getChangeData,
  isAdditionChange,
  isEqualValues,
  isInstanceChange,
  isInstanceElement,
  isObjectType,
  toChange,
  ReferenceExpression,
} from '@salto-io/adapter-api'
import { buildElementsSourceFromElements, inspectValue } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { CredsLease } from '@salto-io/e2e-credentials-store'
import { e2eUtils, elements as elementsUtils } from '@salto-io/adapter-components'
import {
  SPACE_TYPE_NAME,
  PAGE_TYPE_NAME,
  TEMPLATE_TYPE_NAME,
  LABEL_TYPE_NAME,
  SPACE_SETTINGS_TYPE_NAME,
  GLOBAL_TEMPLATE_TYPE_NAME,
} from '../src/constants'
import { Credentials } from '../src/auth'
import { credsLease, realAdapter } from './adapter'
import { getMockValues, uniqueFieldsPerType } from './mock_elements'
import { createFetchDefinitions } from '../src/definitions'
import { UserConfig } from '../src/config'

export const DEFAULT_CONFIG_WITH_PAGES: UserConfig = {
  fetch: {
    ...elementsUtils.query.INCLUDE_ALL_CONFIG,
    hideTypes: true,
    managePagesForSpaces: ['.*'],
  },
}

const log = logger(module)

jest.setTimeout(1000 * 60 * 10)

const fieldsToOmitOnComparisonPerType: Record<string, string[]> = {
  [SPACE_TYPE_NAME]: [
    'permissionInternalIdMap',
    'homepageId',
    'permissions',
    'authorId',
    'createdAt',
    'id',
    'currentActiveAlias',
  ],
  [PAGE_TYPE_NAME]: ['version', 'createdAt', 'parentId', 'spaceId', 'ownerId', 'authorId'],
  [TEMPLATE_TYPE_NAME]: [],
}

const fetchDefinitions = createFetchDefinitions(DEFAULT_CONFIG_WITH_PAGES)

const createChangesForDeploy = (types: ObjectType[], testSuffix: string): Change<InstanceElement>[] => {
  const mockDefaultValues = getMockValues(testSuffix)
  const partialArgs = { types, fetchDefinitions }
  const spaceInstance = e2eUtils.createInstance({
    typeName: SPACE_TYPE_NAME,
    values: mockDefaultValues[SPACE_TYPE_NAME],
    ...partialArgs,
  })

  const spaceRef = new ReferenceExpression(spaceInstance.elemID, spaceInstance)
  const pageInstance = e2eUtils.createInstance({
    typeName: PAGE_TYPE_NAME,
    values: { spaceId: spaceRef, ...mockDefaultValues[PAGE_TYPE_NAME] },
    ...partialArgs,
  })

  const templateInstance = e2eUtils.createInstance({
    typeName: TEMPLATE_TYPE_NAME,
    parent: spaceInstance,
    values: mockDefaultValues[TEMPLATE_TYPE_NAME],
    ...partialArgs,
  })

  return [toChange({ after: spaceInstance }), toChange({ after: pageInstance }), toChange({ after: templateInstance })]
}

describe('Confluence adapter E2E', () => {
  describe('fetch and deploy', () => {
    let credLease: CredsLease<Credentials>
    let adapterAttr: e2eUtils.Reals
    let elements: Element[] = []
    let deployResults: DeployResult[]
    const testSuffix = e2eUtils.getTestSuffix()

    const deployAndFetch = async (changes: Change[]): Promise<void> => {
      deployResults = await e2eUtils.deployChangesForE2e(adapterAttr, changes)
      const fetchResult = await adapterAttr.adapter.fetch({
        progressReporter: { reportProgress: () => null },
      })
      elements = fetchResult.elements
      adapterAttr = realAdapter({
        credentials: credLease.value,
        elementsSource: buildElementsSourceFromElements(elements),
      })
    }
    beforeAll(async () => {
      log.resetLogCount()
      credLease = await credsLease()
      adapterAttr = realAdapter(
        { credentials: credLease.value, elementsSource: buildElementsSourceFromElements([]) },
        DEFAULT_CONFIG_WITH_PAGES,
      )
      const fetchBeforeCleanupResult = await adapterAttr.adapter.fetch({
        progressReporter: { reportProgress: () => null },
      })

      const types = fetchBeforeCleanupResult.elements.filter(isObjectType)
      await e2eUtils.deployCleanup(
        adapterAttr,
        fetchBeforeCleanupResult.elements.filter(isInstanceElement),
        uniqueFieldsPerType,
      )

      const changesToDeploy = createChangesForDeploy(types, testSuffix)
      await deployAndFetch(changesToDeploy)
    })

    afterAll(async () => {
      const appliedChanges = deployResults
        .flatMap(res => res.appliedChanges)
        .filter(isAdditionChange)
        .filter(isInstanceChange)

      const removalChanges = appliedChanges.map(change => toChange({ before: getChangeData(change) }))
      // Making sure space removal is the last one,
      // O.W page and template will be deleted in the service when we delete their father space
      const sortedRemovalChanges = [
        ...removalChanges.filter(change => getChangeData(change).elemID.typeName !== SPACE_TYPE_NAME),
        ...removalChanges.filter(change => getChangeData(change).elemID.typeName === SPACE_TYPE_NAME),
      ]
      await e2eUtils.deployChangesForE2e(adapterAttr, sortedRemovalChanges)
      if (credLease.return) {
        await credLease.return()
      }
      log.info('Confluence adapter E2E: Log counts = %o', log.getLogCount())
    })
    describe('fetch the regular instances and types', () => {
      const expectedTypes = [
        PAGE_TYPE_NAME,
        SPACE_TYPE_NAME,
        TEMPLATE_TYPE_NAME,
        LABEL_TYPE_NAME,
        SPACE_SETTINGS_TYPE_NAME,
        GLOBAL_TEMPLATE_TYPE_NAME,
      ]
      const typesWithInstances = new Set(expectedTypes)

      let createdTypeNames: string[]
      let createdInstances: InstanceElement[]

      beforeAll(async () => {
        createdTypeNames = elements.filter(isObjectType).map(e => e.elemID.typeName)
        createdInstances = elements.filter(isInstanceElement)
      })

      it.each(expectedTypes)('should fetch %s', async typeName => {
        expect(createdTypeNames).toContain(typeName)
        if (typesWithInstances.has(typeName)) {
          expect(createdInstances.filter(instance => instance.elemID.typeName === typeName).length).toBeGreaterThan(0)
        }
      })
    })
    it('should fetch the newly deployed instances', async () => {
      const deployInstances = deployResults
        .map(res => res.appliedChanges)
        .flat()
        .map(change => getChangeData(change)) as InstanceElement[]
      const fetchInstanceIndex = _.keyBy(elements.filter(isInstanceElement), inst => inst.elemID.getFullName())
      deployInstances.forEach(deployedInstance => {
        const { typeName } = deployedInstance.elemID
        const instance = fetchInstanceIndex[deployedInstance.elemID.getFullName()]
        expect(instance).toBeDefined()
        const originalValue = _.omit(instance?.value, fieldsToOmitOnComparisonPerType[typeName])
        const deployedValue = _.omit(deployedInstance.value, fieldsToOmitOnComparisonPerType[typeName])
        const isEqualResult = isEqualValues(originalValue, deployedValue)
        if (!isEqualResult) {
          log.error(
            'Received unexpected result when deploying instance: %s. Deployed value: %s , Received value after fetch: %s',
            deployedInstance.elemID.getFullName(),
            inspectValue(deployedValue, { depth: 7 }),
            inspectValue(originalValue, { depth: 7 }),
          )
        }
        expect(isEqualResult).toBeTruthy()
      })
    })
  })
})
