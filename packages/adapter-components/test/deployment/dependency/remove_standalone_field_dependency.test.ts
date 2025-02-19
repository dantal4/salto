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
  ReferenceExpression,
  BuiltinTypes,
  DependencyChange,
  toChange,
  ListType,
  CORE_ANNOTATIONS,
} from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import { removeStandaloneFieldDependency } from '../../../src/deployment/dependency'

describe('dependency changers', () => {
  let parentType: ObjectType
  let childType: ObjectType
  let parentInstance: InstanceElement
  let childInstance: InstanceElement
  let dependencyChanges: DependencyChange[]
  const stringListType = new ListType(BuiltinTypes.STRING)
  beforeEach(() => {
    parentType = new ObjectType({
      elemID: new ElemID('salto', 'parent'),
      fields: {
        id: {
          refType: BuiltinTypes.STRING,
          annotations: { _required: true },
        },
        children: { refType: stringListType },
      },
    })
    childType = new ObjectType({
      elemID: new ElemID('salto', 'child'),
      fields: {
        id: {
          refType: BuiltinTypes.STRING,
          annotations: { _required: true },
        },
      },
      annotationRefsOrTypes: {
        [CORE_ANNOTATIONS.PARENT]: BuiltinTypes.STRING,
      },
    })
    parentInstance = new InstanceElement('inst', parentType, {
      id: '1',
      children: [new ReferenceExpression(new ElemID('salto', 'child', 'instance', 'inst'))],
    })
    childInstance = new InstanceElement(
      'inst',
      childType,
      {
        id: '2',
      },
      undefined,
      {
        _parent: [new ReferenceExpression(new ElemID('salto', 'parent', 'instance', 'inst'))],
      },
    )
  })

  describe('removeStandaloneFieldDependency', () => {
    it('should remove dependency between the parent to the child', async () => {
      const inputChanges = new Map([
        [0, toChange({ after: parentInstance })],
        [1, toChange({ after: childInstance })],
      ])
      const inputDeps = new Map<collections.set.SetId, Set<collections.set.SetId>>([
        [0, new Set([1])],
        [1, new Set([0])],
      ])
      dependencyChanges = [...(await removeStandaloneFieldDependency(inputChanges, inputDeps))]
      expect(dependencyChanges).toHaveLength(1)
      expect(dependencyChanges[0].action).toEqual('remove')
      expect(dependencyChanges[0].dependency.source).toEqual(0)
      expect(dependencyChanges[0].dependency.target).toEqual(1)
    })
    it('should not remove if there are no deps', async () => {
      const inputChanges = new Map([
        [0, toChange({ after: parentInstance })],
        [1, toChange({ after: childInstance })],
      ])
      dependencyChanges = [...(await removeStandaloneFieldDependency(inputChanges, new Map()))]
      expect(dependencyChanges).toHaveLength(0)
    })
    it('should not remove if the annotation is not _parent', async () => {
      const newChildInstance = new InstanceElement('inst', childType, { id: '2' }, undefined, {
        parent: [new ReferenceExpression(new ElemID('salto', 'parent', 'instance', 'inst'))],
      })
      const inputChanges = new Map([
        [0, toChange({ after: parentInstance })],
        [1, toChange({ after: newChildInstance })],
      ])
      const inputDeps = new Map<collections.set.SetId, Set<collections.set.SetId>>([
        [0, new Set([1])],
        [1, new Set([0])],
      ])
      dependencyChanges = [...(await removeStandaloneFieldDependency(inputChanges, inputDeps))]
      expect(dependencyChanges).toHaveLength(0)
    })
    it('should not remove if the dep is only one way', async () => {
      const inputChanges = new Map([
        [0, toChange({ after: parentInstance })],
        [1, toChange({ after: childInstance })],
      ])
      const inputDeps = new Map<collections.set.SetId, Set<collections.set.SetId>>([[0, new Set([1])]])
      dependencyChanges = [...(await removeStandaloneFieldDependency(inputChanges, inputDeps))]
      expect(dependencyChanges).toHaveLength(0)
    })
  })
})
