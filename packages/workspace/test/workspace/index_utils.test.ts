/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  BuiltinTypes,
  ElemID,
  InstanceElement,
  ObjectType,
  getChangeData,
  toChange,
  Element,
  Change,
} from '@salto-io/adapter-api'
import { buildElementsSourceFromElements } from '@salto-io/adapter-utils'
import { MockInterface } from '@salto-io/test-utils'
import { getAllElementsChanges, getBaseChanges, updateIndex } from '../../src/workspace/index_utils'
import { RemoteMap } from '../../src/workspace/remote_map'
import { ElementsSource, createInMemoryElementSource } from '../../src/workspace/elements_source'
import { createMockRemoteMap } from '../utils'

describe('index utils', () => {
  describe('getAllElementsChanges', () => {
    const firstObject = new ObjectType({ elemID: new ElemID('adapter', 'type1') })
    const secondObject = new ObjectType({ elemID: new ElemID('adapter', 'type2') })
    const thirdObject = new ObjectType({ elemID: new ElemID('adapter', 'type3') })
    const elements = [firstObject, secondObject]
    const elementsSource = buildElementsSourceFromElements(elements)
    it('should return all elements', async () => {
      const result = await getAllElementsChanges([], elementsSource)
      expect(result).toEqual([toChange({ after: firstObject }), toChange({ after: secondObject })])
    })
    it('should merge current changes with all other element changes', async () => {
      const result = await getAllElementsChanges([toChange({ after: thirdObject })], elementsSource)
      expect(result).toEqual([
        toChange({ after: firstObject }),
        toChange({ after: secondObject }),
        toChange({ after: thirdObject }),
      ])
    })
    describe('when an element exists in the change list and also in the element source', () => {
      let result: Change<Element>[]
      beforeEach(async () => {
        result = await getAllElementsChanges([toChange({ before: firstObject, after: firstObject })], elementsSource)
      })
      it('should return only the original change for the element', () => {
        const objChanges = result.filter(change => getChangeData(change).elemID.isEqual(firstObject.elemID))
        expect(objChanges).toHaveLength(1)
        expect(objChanges[0].action).toEqual('modify')
      })
    })
  })
  describe('getBaseChanges', () => {
    const addedObject = new ObjectType({
      elemID: new ElemID('adapter', 'addedType'),
      fields: {
        field: { refType: BuiltinTypes.BOOLEAN },
      },
    })
    const deletedObject = new ObjectType({
      elemID: new ElemID('adapter', 'deletedType'),
      fields: {
        field: { refType: BuiltinTypes.BOOLEAN },
      },
    })
    const modifiedObjectBefore = new ObjectType({
      elemID: new ElemID('adapter', 'modifiedType'),
      fields: {
        deletedField: { refType: BuiltinTypes.BOOLEAN },
        modifiedField: { refType: BuiltinTypes.BOOLEAN },
        sameField: { refType: BuiltinTypes.BOOLEAN },
      },
    })
    const modifiedObjectAfter = new ObjectType({
      elemID: new ElemID('adapter', 'modifiedType'),
      fields: {
        addedField: { refType: BuiltinTypes.BOOLEAN },
        modifiedField: { refType: BuiltinTypes.BOOLEAN, annotations: { new: true } },
        sameField: { refType: BuiltinTypes.BOOLEAN },
      },
    })
    const addedInstance = new InstanceElement('instance', addedObject)

    it('should return all changes', () => {
      const changes = [
        toChange({ after: addedObject }),
        toChange({ before: deletedObject }),
        toChange({ before: modifiedObjectBefore, after: modifiedObjectAfter }),
        toChange({ after: addedInstance }),
      ]
      expect(getBaseChanges(changes)).toEqual([
        toChange({ after: addedObject }),
        toChange({ before: deletedObject }),
        toChange({ before: modifiedObjectBefore, after: modifiedObjectAfter }),
        toChange({ after: addedInstance }),
        toChange({ after: addedObject.fields.field }),
        toChange({ before: deletedObject.fields.field }),
        toChange({ before: modifiedObjectBefore.fields.deletedField }),
        toChange({
          before: modifiedObjectBefore.fields.modifiedField,
          after: modifiedObjectAfter.fields.modifiedField,
        }),
        toChange({ after: modifiedObjectAfter.fields.addedField }),
      ])
    })
  })
  describe('updateIndex', () => {
    const indexVersionKey = 'index-key'
    const indexVersion = 1
    const indexName = 'index'

    let index: MockInterface<RemoteMap<string>>
    let mapVersions: MockInterface<RemoteMap<number>>
    let elementsSource: ElementsSource
    const updateChangesMock = jest.fn()

    const objectChange = toChange({
      after: new ObjectType({ elemID: new ElemID('adapter', 'type') }),
    })

    beforeEach(() => {
      jest.resetAllMocks()
      index = createMockRemoteMap()
      mapVersions = createMockRemoteMap()
      mapVersions.get.mockResolvedValue(indexVersion)
      elementsSource = createInMemoryElementSource()
    })
    it('should not clear index when cache is valid', async () => {
      await updateIndex({
        changes: [objectChange],
        index,
        indexVersionKey,
        indexVersion,
        indexName,
        mapVersions,
        elementsSource,
        isCacheValid: true,
        updateChanges: updateChangesMock,
      })
      expect(index.clear).not.toHaveBeenCalled()
      expect(mapVersions.set).not.toHaveBeenCalled()
      expect(updateChangesMock).toHaveBeenCalledWith([objectChange], index)
    })
    it('should clear index when cache is invalid', async () => {
      await updateIndex({
        changes: [objectChange],
        index,
        indexVersionKey,
        indexVersion,
        indexName,
        mapVersions,
        elementsSource,
        isCacheValid: false,
        updateChanges: updateChangesMock,
      })
      expect(index.clear).toHaveBeenCalled()
      expect(mapVersions.set).toHaveBeenCalled()
      expect(updateChangesMock).toHaveBeenCalledWith([objectChange], index)
    })
    it("should clear index when index version isn't updated", async () => {
      mapVersions.get.mockResolvedValue(0)
      await elementsSource.set(getChangeData(objectChange))
      await updateIndex({
        changes: [],
        index,
        indexVersionKey,
        indexVersion,
        indexName,
        mapVersions,
        elementsSource,
        isCacheValid: true,
        updateChanges: updateChangesMock,
      })
      expect(index.clear).toHaveBeenCalled()
      expect(mapVersions.set).toHaveBeenCalledWith(indexVersionKey, indexVersion)
      expect(updateChangesMock).toHaveBeenCalledWith([objectChange], index)
    })
  })
})
