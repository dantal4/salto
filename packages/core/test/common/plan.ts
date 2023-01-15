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
import wu from 'wu'
import {
  Change, ObjectType, isObjectType, ElemID, getChangeData, ChangeWithDetails,
} from '@salto-io/adapter-api'
import { Group, DAG } from '@salto-io/dag'
import { Plan, PlanItem, PlanItemId } from '../../src/core/plan'
import { addPlanItemAccessors } from '../../src/core/plan/plan_item'
import { toDetailedChanges } from '../../src/core/plan/plan'
import { getAllElements } from './elements'

export const createPlan = (changeGroups: Change[][]): Plan => {
  const toGroup = (changes: Change[]): Group<ChangeWithDetails> => ({
    groupKey: changes.length > 0
      ? getChangeData(changes[0]).elemID.createTopLevelParentID().parent.getFullName()
      : '',
    items: new Map(changes.map((change, idx) => [`${idx}`, { ...change, detailedChanges: toDetailedChanges(change) }])),
  })
  const graph = new DAG<Group<ChangeWithDetails>>(
    changeGroups.map((_changes, idx) => [`${idx}`, new Set()]),
    new Map(changeGroups.map((changes, idx) => [`${idx}`, toGroup(changes)])),
  )
  return Object.assign(
    graph,
    {
      itemsByEvalOrder: () => wu(graph.keys())
        .map(id => graph.getData(id))
        .map(addPlanItemAccessors),
      getItem: (id: PlanItemId) => addPlanItemAccessors(graph.getData(id)),
      changeErrors: [],
    }
  )
}

export const getPlan = (): Plan => {
  const elem = getAllElements().find(isObjectType) as ObjectType
  return createPlan([[{ action: 'add', data: { after: elem } }]])
}

export const getFirstPlanItem = (plan: Plan): PlanItem =>
  wu(plan.itemsByEvalOrder()).next().value

export const getChange = (item: PlanItem, elemID: ElemID): Change =>
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  wu(item.changes()).find(change => getChangeData(change).elemID.isEqual(elemID))!
