type Confidence = "HIGH" | "MEDIUM" | "LOW";

type IdentifyingDetails = {
  fullName: string | null;
  dateOfBirth: string | null;
  age: string | null;
  occupation: string | null;
  location: string | null;
};

type GuardableScreeningResult = {
  isMatch: boolean;
  confidence: Confidence;
  matchReasoning: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | null;
  sentimentReasoning: string | null;
  identifyingDetailsFound: IdentifyingDetails;
};

const MONTH_DATE_YEAR_RE =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},\s+((?:19|20)\d{2})\b/i;

const ORGANIZATION_SUFFIX_RE =
  /\b(?:inc|inc\.|incorporated|corp|corp\.|corporation|company|co\.|llc|ltd|ltd\.|limited|plc|llp|gmbh|ag|sa|s\.a\.|nv|n\.v\.)\b/i;

const parseSubmittedBirthYear = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(dateOfBirth.trim());
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isInteger(year) ? year : null;
};

const parseArticleAge = (age: string | null): number | null => {
  if (!age) return null;
  const match = /\b(\d{1,3})\b/.exec(age);
  if (!match) return null;
  const parsed = Number(match[1]);
  return parsed >= 0 && parsed <= 120 ? parsed : null;
};

const findArticleYear = (articleTitle: string, articleText: string): number | null => {
  const text = `${articleTitle}\n${articleText}`;
  const monthDateYear = MONTH_DATE_YEAR_RE.exec(text);
  if (monthDateYear) return Number(monthDateYear[1]);

  return null;
};

const hasDobAgeConflict = (birthYear: number, articleAge: number, articleYear: number): boolean => {
  const possibleAges = new Set([articleYear - birthYear, articleYear - birthYear - 1]);
  return !possibleAges.has(articleAge);
};

const getOrganizationIndicator = (submittedName: string): string | null => {
  const match = ORGANIZATION_SUFFIX_RE.exec(submittedName);
  return match?.[0] ?? null;
};

const buildOrganizationSubjectReasoning = (
  submittedName: string,
  organizationIndicator: string,
  details: IdentifyingDetails,
): string => {
  const location = details.location ? ` The article also identifies a company location: ${details.location}.` : "";

  return (
    `The submitted subject "${submittedName}" appears to be an organization rather than an individual ` +
    `because it includes the corporate designator "${organizationIndicator}". ` +
    "This screening workflow is designed for individual adverse-media screening. " +
    `Although the article discusses negative allegations about ${details.fullName ?? submittedName}, ` +
    `it should not be treated as a matched person case.${location}`
  );
};

const describeArticleIdentity = (submittedName: string, details: IdentifyingDetails): string => {
  const identifiers = [
    details.fullName ? `name "${details.fullName}"` : null,
    details.occupation ? `role "${details.occupation}"` : null,
    details.location ? `location "${details.location}"` : null,
  ].filter(Boolean);

  if (identifiers.length === 0) {
    return `The article has some possible name or context overlap with the submitted subject "${submittedName}".`;
  }

  return `The article has possible match indicators for "${submittedName}", including ${identifiers.join(", ")}.`;
};

const buildDobAgeConflictReasoning = (
  submittedName: string,
  submittedDateOfBirth: string,
  birthYear: number,
  articleAge: number,
  articleYear: number | null,
  details: IdentifyingDetails,
): string | null => {
  const identitySummary = describeArticleIdentity(submittedName, details);

  if (articleYear !== null) {
    const possibleAgeStart = articleYear - birthYear - 1;
    const possibleAgeEnd = articleYear - birthYear;

    if (!hasDobAgeConflict(birthYear, articleAge, articleYear)) return null;

    return (
      `${identitySummary} ` +
      "However, there is a hard identifier conflict: " +
      `The submitted DOB (${submittedDateOfBirth}) implies age ${possibleAgeStart}-${possibleAgeEnd} ` +
      `in article year ${articleYear}, but the article reports age ${articleAge}. ` +
      "Because the age evidence conflicts with the submitted DOB, this cannot be treated as a confirmed match and requires analyst review."
    );
  }

  const currentYear = new Date().getUTCFullYear();
  const maximumPossibleAge = currentYear - birthYear;

  if (articleAge <= maximumPossibleAge) return null;

  return (
    `${identitySummary} ` +
    "However, there is a hard identifier conflict: " +
    `The submitted DOB (${submittedDateOfBirth}) means the subject cannot be older than ${maximumPossibleAge} ` +
    `in ${currentYear}, but the article reports age ${articleAge}. ` +
    "Because the age evidence conflicts with the submitted DOB, this cannot be treated as a confirmed match and requires analyst review."
  );
};

export const applyDeterministicIdentityGuards = <T extends GuardableScreeningResult>(
  result: T,
  submittedName: string,
  submittedDateOfBirth: string | null,
  articleTitle: string,
  articleText: string,
): T => {
  const organizationIndicator = getOrganizationIndicator(submittedName);
  if (organizationIndicator) {
    return {
      ...result,
      isMatch: false,
      confidence: "HIGH",
      sentiment: null,
      sentimentReasoning: null,
      matchReasoning: buildOrganizationSubjectReasoning(
        submittedName,
        organizationIndicator,
        result.identifyingDetailsFound,
      ),
    };
  }

  const birthYear = parseSubmittedBirthYear(submittedDateOfBirth);
  const articleAge = parseArticleAge(result.identifyingDetailsFound.age);
  const articleYear = findArticleYear(articleTitle, articleText);

  if (
    !result.isMatch ||
    birthYear === null ||
    articleAge === null ||
    submittedDateOfBirth === null
  ) {
    return result;
  }

  const guardReasoning = buildDobAgeConflictReasoning(
    submittedName,
    submittedDateOfBirth,
    birthYear,
    articleAge,
    articleYear,
    result.identifyingDetailsFound,
  );

  if (!guardReasoning) return result;

  return {
    ...result,
    confidence: "LOW",
    matchReasoning: guardReasoning,
  };
};
