/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { CORE_ANNOTATIONS, InstanceElement, ReferenceExpression, toChange } from '@salto-io/adapter-api'
import { INTERNAL_ID, PATH } from '../../src/constants'
import fileCabinetInternalIdsValidator from '../../src/change_validators/file_cabinet_internal_ids'
import { fileType, folderType } from '../../src/types/file_cabinet_types'
import { mockChangeValidatorParams } from '../utils'

describe('suiteapp file cabinet internal ids validator', () => {
  const file = fileType()
  const folder = folderType()
  describe('removals/modifications', () => {
    let removedFile: InstanceElement
    let updatedBefore: InstanceElement
    let updatedAfter: InstanceElement
    beforeEach(() => {
      removedFile = new InstanceElement('someFile', file)
      updatedBefore = new InstanceElement('someFolder', folder)
      updatedAfter = new InstanceElement('someFolder', folder, { description: 'updated' })
    })
    it('should not have change errors when there are internal ids', async () => {
      removedFile.value[INTERNAL_ID] = '101'
      updatedBefore.value[INTERNAL_ID] = '2'
      updatedAfter.value[INTERNAL_ID] = '2'
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ before: removedFile }), toChange({ before: updatedBefore, after: updatedAfter })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(0)
    })
    it('should have change errors when there are no internal ids', async () => {
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ before: removedFile }), toChange({ before: updatedBefore, after: updatedAfter })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(2)
    })
  })
  describe('additions', () => {
    let addedFile: InstanceElement
    let addedFolder: InstanceElement
    let existingFolder: InstanceElement
    beforeEach(() => {
      addedFile = new InstanceElement('someFile', file)
      addedFolder = new InstanceElement('someFolder1', folder)
      existingFolder = new InstanceElement('someFolder', folder)
    })
    it('should not have change errors', async () => {
      existingFolder.value[PATH] = '/someFolder'
      existingFolder.value[INTERNAL_ID] = '2'
      addedFolder.value[PATH] = '/someFolder/someFolder1'
      addedFolder.annotations[CORE_ANNOTATIONS.PARENT] = [
        new ReferenceExpression(existingFolder.elemID, undefined, existingFolder),
      ]
      addedFile.value[PATH] = '/someFolder/someFolder1/someFile'
      addedFile.annotations[CORE_ANNOTATIONS.PARENT] = [
        new ReferenceExpression(addedFolder.elemID, undefined, addedFolder),
      ]
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ after: addedFile }), toChange({ after: addedFolder })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(0)
    })
    it('should not have change errors when path is top level', async () => {
      addedFolder.value[PATH] = '/someFolder1'
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ after: addedFolder })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(0)
    })
    it('should have change error when path is not top level and _parent is undefined', async () => {
      addedFolder.value[PATH] = '/someFolder/someFolder1'
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ after: addedFolder })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(1)
    })
    it('should have change error when path is top level and _parent is not undefined', async () => {
      addedFolder.value[PATH] = '/someFolder1'
      addedFolder.annotations[CORE_ANNOTATIONS.PARENT] = [
        new ReferenceExpression(existingFolder.elemID, undefined, existingFolder),
      ]
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ after: addedFolder })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(1)
    })
    it('should have change error when _parent is not a one item list', async () => {
      addedFile.value[PATH] = '/someFolder/someFile'
      addedFile.annotations[CORE_ANNOTATIONS.PARENT] = '/someFolder'
      addedFolder.value[PATH] = '/someFolder/someFolder1'
      addedFolder.annotations[CORE_ANNOTATIONS.PARENT] = ['/', '/someFolder']
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ after: addedFile }), toChange({ after: addedFolder })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(2)
    })
    it('should have change error when _parent is not a reference to a folder', async () => {
      addedFile.value[PATH] = '/someFolder/someFile'
      addedFile.annotations[CORE_ANNOTATIONS.PARENT] = ['[/someFolder]']
      addedFolder.value[PATH] = '/someFolder/someFolder1'
      addedFolder.annotations[CORE_ANNOTATIONS.PARENT] = [
        new ReferenceExpression(addedFile.elemID, undefined, addedFile),
      ]
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ after: addedFile }), toChange({ after: addedFolder })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(2)
    })
    it('should have change error when path does not match _parent', async () => {
      addedFolder.value[PATH] = '/someFolder/someFolder1'
      existingFolder.value[PATH] = '/someFolder2'
      addedFolder.annotations[CORE_ANNOTATIONS.PARENT] = [
        new ReferenceExpression(existingFolder.elemID, undefined, existingFolder),
      ]
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ after: addedFolder })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(1)
    })
    it('should have change error when the parent folder has no internal id', async () => {
      existingFolder.value[PATH] = '/someFolder'
      addedFolder.value[PATH] = '/someFolder/someFolder1'
      addedFolder.annotations[CORE_ANNOTATIONS.PARENT] = [
        new ReferenceExpression(existingFolder.elemID, undefined, existingFolder),
      ]
      const result = await fileCabinetInternalIdsValidator(
        [toChange({ after: addedFolder })],
        mockChangeValidatorParams(),
      )
      expect(result).toHaveLength(1)
    })
  })
})
