"use client";

const COMPANY_ACTIVITY_UPDATED_EVENT = "company-activity-updated";

export function emitCompanyActivityUpdated(companyId: string) {
  window.dispatchEvent(
    new CustomEvent<string>(COMPANY_ACTIVITY_UPDATED_EVENT, {
      detail: companyId,
    })
  );
}

export function onCompanyActivityUpdated(
  listener: (companyId: string) => void
) {
  const handler = (event: Event) => {
    const companyId = (event as CustomEvent<string>).detail;
    listener(companyId);
  };

  window.addEventListener(COMPANY_ACTIVITY_UPDATED_EVENT, handler);

  return () => {
    window.removeEventListener(COMPANY_ACTIVITY_UPDATED_EVENT, handler);
  };
}
