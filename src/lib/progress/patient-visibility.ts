export function isProgressAnalysisVisibleToPatient(visibleToPatient: boolean): boolean {
  return visibleToPatient === true;
}

export function canPatientWriteProgress(): boolean {
  return false;
}

export function filterProgressForPatient<T extends { visible_to_patient?: boolean; is_deleted?: boolean }>(input: {
  checkins: T[];
  composition: T[];
  adherenceNotes: T[];
  analyses: T[];
}) {
  const visible = (rows: T[]) =>
    rows.filter((r) => r.visible_to_patient === true && !r.is_deleted);
  return {
    checkins: visible(input.checkins),
    composition: visible(input.composition),
    adherenceNotes: visible(input.adherenceNotes),
    analyses: input.analyses.filter((a) => a.visible_to_patient === true),
  };
}
