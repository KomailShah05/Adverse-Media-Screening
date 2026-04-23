export const IDENTIFYING_DETAIL_ROWS = [
  { field: "Full Name", foundKey: "fullName" as const, useSubmittedName: true },
  { field: "Date of Birth", foundKey: "dateOfBirth" as const, useSubmittedDob: true },
  { field: "Age", foundKey: "age" as const },
  { field: "Occupation", foundKey: "occupation" as const },
  { field: "Location", foundKey: "location" as const },
  { field: "Nationality", foundKey: "nationality" as const },
] as const;
