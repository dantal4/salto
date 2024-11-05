/*
 * Copyright 2024 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { collections } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { ElemID, Element, ReadOnlyElementsSource, isElement } from '@salto-io/adapter-api'
import { MultiEnvSource } from './nacl_files/multi_env/multi_env_source'
import { ReferenceIndexEntry } from './reference_indexes'
import { ReadOnlyRemoteMap } from './remote_map'

const log = logger(module)
const { awu } = collections.asynciterable

const getDependentIDsFromReferenceSourceIndex = async (
  elemIDs: ElemID[],
  referenceSourcesIndex: ReadOnlyRemoteMap<ReferenceIndexEntry[]>,
  elementsSource: ReadOnlyElementsSource,
): Promise<ElemID[]> =>
  log.timeDebug(
    async () => {
      const addedIDs = new Set<string>()

      const getDependentIDs = async (ids: ElemID[]): Promise<ElemID[]> => {
        ids.forEach(id => {
          addedIDs.add(id.getFullName())
        })

        const dependentIDs = await log.timeTrace(
          async () =>
            awu(ids)
              // TODO: should we filter out weak referenecs or references that aren't in the element?
              .map(id => referenceSourcesIndex.get(id.getFullName()))
              .flatMap(references => references ?? [])
              .map(ref => ref.id.createTopLevelParentID().parent)
              .filter(id => !addedIDs.has(id.getFullName()))
              .uniquify(id => id.getFullName())
              .toArray(),
          'getDependentIDs for %d ids',
          ids.length,
        )

        return dependentIDs.length === 0 ? dependentIDs : dependentIDs.concat(await getDependentIDs(dependentIDs))
      }

      const dependentIDs = await getDependentIDs(elemIDs)
      const additionalDependentInstanceIDs = await awu(await elementsSource.list())
        .filter(
          id =>
            id.idType === 'instance' &&
            !addedIDs.has(id.getFullName()) &&
            addedIDs.has(`${id.adapter}${ElemID.NAMESPACE_SEPARATOR}${id.typeName}`),
        )
        .toArray()

      return dependentIDs.concat(additionalDependentInstanceIDs)
    },
    'getDependentIDsFromReferenceSourceIndex for %d elemIDs',
    elemIDs.length,
  )

const getDependentIDsFromReferencedFiles = async (
  elemIDs: ElemID[],
  naclFilesSource: MultiEnvSource,
  envName: string,
): Promise<ElemID[]> =>
  log.timeDebug(
    async () => {
      const addedIDs = new Set<string>()

      const getDependentIDs = async (ids: ElemID[]): Promise<ElemID[]> =>
        log.timeTrace(
          async () => {
            ids.forEach(id => addedIDs.add(id.getFullName()))
            const filesWithDependencies = await log.timeTrace(
              async () =>
                awu(ids)
                  .flatMap(id => naclFilesSource.getElementReferencedFiles(envName, id))
                  .uniquify(filename => filename)
                  .toArray(),

              'running getElementReferencedFiles for %d ids',
              ids.length,
            )
            const dependentsIDs = await log.timeTrace(
              async () =>
                awu(filesWithDependencies)
                  .map(filename => naclFilesSource.getParsedNaclFile(filename))
                  .flatMap(async naclFile => ((await naclFile?.elements()) ?? []).map(elem => elem.elemID))
                  .filter(id => !addedIDs.has(id.getFullName()))
                  .uniquify(id => id.getFullName())
                  .toArray(),
              'get dependentsIDs from %d files',
              filesWithDependencies.length,
            )
            return dependentsIDs.length === 0
              ? dependentsIDs
              : dependentsIDs.concat(await getDependentIDs(dependentsIDs))
          },
          'getDependentIDs for %d ids',
          ids.length,
        )

      return getDependentIDs(elemIDs)
    },
    'getDependentIDsFromReferencedFiles for %d elemIDs',
    elemIDs.length,
  )

export const getDependents = async (
  elemIDs: ElemID[],
  elementsSource: ReadOnlyElementsSource,
  referenceSourcesIndex: ReadOnlyRemoteMap<ReferenceIndexEntry[]>,
  naclFilesSource: MultiEnvSource,
  envName: string,
): Promise<Element[]> => {
  const flagValue = process.env.SALTO_USE_OLD_DEPENDENTS_CALCULATION
  let parsedFlagValue: unknown
  try {
    parsedFlagValue = flagValue === undefined ? undefined : JSON.parse(flagValue)
  } catch (e) {
    parsedFlagValue = flagValue
  }
  const useOldDependentsCalculation = Boolean(parsedFlagValue)

  const dependentIDs = useOldDependentsCalculation
    ? await getDependentIDsFromReferencedFiles(elemIDs, naclFilesSource, envName)
    : await getDependentIDsFromReferenceSourceIndex(elemIDs, referenceSourcesIndex, elementsSource)

  const dependents = (
    await log.timeDebug(
      () => Promise.all(dependentIDs.map(id => elementsSource.get(id))),
      'getting %d dependents from elements source',
      dependentIDs.length,
    )
  ).filter(isElement)

  log.debug('found %d dependents of %d elements', dependents.length, elemIDs.length)

  return dependents
}