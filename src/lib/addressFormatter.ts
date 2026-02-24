/**
 * Utility functions for formatting structured addresses into display strings
 */

export interface AddressComponents {
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
  address4?: string | null;
  address5?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  email?: string | null;
  telephone?: string | null;
  mobile?: string | null;
}

/**
 * Formats structured address components into a multi-line display string
 * Returns null if all fields are empty
 */
export function formatStructuredAddress(components: AddressComponents): string | null {
  const lines: string[] = [];

  // Add name if present
  if (components.name?.trim()) {
    lines.push(components.name.trim());
  }

  // Add address lines (1-5) if present
  [
    components.address1,
    components.address2,
    components.address3,
    components.address4,
    components.address5,
  ].forEach((line) => {
    if (line?.trim()) {
      lines.push(line.trim());
    }
  });

  // Add town and county on same line if both present
  const locationParts: string[] = [];
  if (components.town?.trim()) {
    locationParts.push(components.town.trim());
  }
  if (components.county?.trim()) {
    locationParts.push(components.county.trim());
  }
  if (locationParts.length > 0) {
    lines.push(locationParts.join(', '));
  }

  // Add postcode and country on same line if present
  const postcodeCountryParts: string[] = [];
  if (components.postcode?.trim()) {
    postcodeCountryParts.push(components.postcode.trim());
  }
  if (components.country?.trim()) {
    postcodeCountryParts.push(components.country.trim());
  }
  if (postcodeCountryParts.length > 0) {
    lines.push(postcodeCountryParts.join(' '));
  }

  // Add contact information if present
  if (components.email?.trim()) {
    lines.push(`Email: ${components.email.trim()}`);
  }
  if (components.telephone?.trim()) {
    lines.push(`Tel: ${components.telephone.trim()}`);
  }
  if (components.mobile?.trim()) {
    lines.push(`Mobile: ${components.mobile.trim()}`);
  }

  // Return null if no lines were added
  if (lines.length === 0) {
    return null;
  }

  return lines.join('\n');
}
