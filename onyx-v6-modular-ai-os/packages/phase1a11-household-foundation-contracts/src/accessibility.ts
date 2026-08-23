export type AccessibleName = string;
export type AccessibleDescription = string;
export type KeyboardOperation = "tab" | "enter" | "space" | "escape" | "arrow";
export type DisclosureState = "collapsed" | "expanded" | "hidden";
export type StatusAnnouncement = "polite" | "assertive";

export interface FocusBehavior {
  focusTarget: string;
  trapFocus: boolean;
  restoreFocus: boolean;
}

export interface ErrorAssociation {
  controlId: string;
  errorMessageId: string;
}

export interface ReducedMotionPreference {
  prefersReducedMotion: boolean;
}

export interface ContrastRequirement {
  minimumContrastRatio: number;
  textRole: "normal" | "large";
}

export interface ResponsiveReadabilityRequirement {
  minTextSize: number;
  supportsZoom: boolean;
  responsiveLayout: boolean;
}

export interface NonColorStatusRepresentation {
  statusText: string;
  icon: string;
  accessibleLabel: string;
}

export interface TechnicalInformationAccessibility {
  disclosureState: DisclosureState;
  keyboardAccessible: boolean;
  announcedByScreenReader: boolean;
  requiresUserAction: true;
}

export interface DocumentAccessibilityMetadata {
  headingHierarchy: string[];
  tableHeadersPresent: boolean;
  linkTextReadable: boolean;
  nonColorStatusRepresentation: NonColorStatusRepresentation;
}
