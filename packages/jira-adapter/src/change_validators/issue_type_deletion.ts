/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  Change,
  ChangeError,
  ChangeValidator,
  getChangeData,
  InstanceElement,
  isInstanceChange,
  isRemovalChange,
  RemovalChange,
  SeverityLevel,
} from '@salto-io/adapter-api'
import { safeJsonStringify } from '@salto-io/adapter-utils'
import { client as clientUtils } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import { collections } from '@salto-io/lowerdash'
import { ISSUE_TYPE_NAME } from '../constants'
import JiraClient from '../client/client'

const { awu } = collections.asynciterable

const log = logger(module)

export const isIssueTypeUsed = async (instance: InstanceElement, client: JiraClient): Promise<boolean> => {
  let response: clientUtils.Response<clientUtils.ResponseValue | clientUtils.ResponseValue[]>
  try {
    response = await client.get({
      url: '/rest/api/3/search',
      queryParams: {
        jql: `issuetype = "${instance.value.name}"`,
        maxResults: '0',
      },
    })
  } catch (e) {
    log.error(
      `Received an error Jira search API, ${e.message}. Assuming issue type ${instance.elemID.getFullName()} has no issues.`,
    )
    return false
  }

  if (Array.isArray(response.data) || response.data.total === undefined) {
    log.error(
      `Received invalid response from Jira search API, ${safeJsonStringify(response.data, undefined, 2)}. Assuming issue type ${instance.elemID.getFullName()} has no issues.`,
    )
    return false
  }

  log.debug(`Issue type ${instance.elemID.getFullName()} has ${response.data.total} issues.`)

  return response.data.total !== 0
}
const getRelevantChanges = (changes: ReadonlyArray<Change>): RemovalChange<InstanceElement>[] =>
  changes
    .filter(isInstanceChange)
    .filter(isRemovalChange)
    .filter(change => getChangeData(change).elemID.typeName === ISSUE_TYPE_NAME)

const getRemovedIssueTypeUsedError = (instance: InstanceElement): ChangeError => ({
  elemID: instance.elemID,
  severity: 'Error' as SeverityLevel,
  message: 'Cannot remove issue type with existing issues.',
  detailedMessage:
    'There are existing issues of this issue type. You must delete them before you can delete the issue type itself.',
})

export const issueTypeDeletionValidator: (client: JiraClient) => ChangeValidator = client => async changes => {
  const relevantChanges = getRelevantChanges(changes)
  return awu(relevantChanges)
    .map(getChangeData)
    .filter(instance => isIssueTypeUsed(instance, client))
    .map(getRemovedIssueTypeUsedError)
    .toArray()
}
