/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  ObjectType,
  InstanceElement,
  ElemID,
  toChange,
  CORE_ANNOTATIONS,
  ReferenceExpression,
} from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import { globalFieldContextsDependencyChanger } from '../../src/dependency_changers/global_field_contexts'
import { JIRA } from '../../src/constants'
import { FIELD_CONTEXT_TYPE_NAME, FIELD_TYPE_NAME } from '../../src/filters/fields/constants'

describe('globalFieldContextsDependencyChanger', () => {
  let instance: InstanceElement
  let fieldType: ObjectType
  beforeEach(() => {
    const contextType = new ObjectType({
      elemID: new ElemID(JIRA, FIELD_CONTEXT_TYPE_NAME),
    })

    fieldType = new ObjectType({
      elemID: new ElemID(JIRA, FIELD_TYPE_NAME),
    })

    instance = new InstanceElement('inst', contextType, {}, [], {
      [CORE_ANNOTATIONS.PARENT]: [
        new ReferenceExpression(
          new ElemID(JIRA, FIELD_CONTEXT_TYPE_NAME, 'instance', 'parent'),
          new InstanceElement('parent', fieldType),
        ),
      ],
    })
  })

  it('should add dependency from an added global context to a removed global context', async () => {
    const inputChanges = new Map([
      [0, toChange({ after: instance })],
      [1, toChange({ before: instance })],
    ])
    const inputDeps = new Map<collections.set.SetId, Set<collections.set.SetId>>([])

    const dependencyChanges = [...(await globalFieldContextsDependencyChanger(inputChanges, inputDeps))]
    expect(dependencyChanges).toHaveLength(1)
    expect(dependencyChanges[0].action).toEqual('add')
    expect(dependencyChanges[0].dependency.source).toEqual(0)
    expect(dependencyChanges[0].dependency.target).toEqual(1)
  })

  it('should not add dependency if the parent field is different', async () => {
    const differentInstance = instance.clone()
    differentInstance.annotations[CORE_ANNOTATIONS.PARENT] = [
      new ReferenceExpression(
        new ElemID(JIRA, FIELD_CONTEXT_TYPE_NAME, 'instance', 'parent2'),
        new InstanceElement('parent2', fieldType),
      ),
    ]

    const inputChanges = new Map([
      [0, toChange({ after: differentInstance })],
      [1, toChange({ before: instance })],
    ])
    const inputDeps = new Map<collections.set.SetId, Set<collections.set.SetId>>([])

    const dependencyChanges = [...(await globalFieldContextsDependencyChanger(inputChanges, inputDeps))]
    expect(dependencyChanges).toHaveLength(0)
  })
  it('should not add dependency if the parent field is deleted', async () => {
    const deletedParentInstance = instance.clone()
    deletedParentInstance.annotations[CORE_ANNOTATIONS.PARENT] = []
    const inputChanges = new Map([
      [0, toChange({ after: deletedParentInstance })],
      [1, toChange({ before: deletedParentInstance })],
    ])
    const inputDeps = new Map<collections.set.SetId, Set<collections.set.SetId>>([])

    const dependencyChanges = [...(await globalFieldContextsDependencyChanger(inputChanges, inputDeps))]
    expect(dependencyChanges).toHaveLength(0)
  })
})
