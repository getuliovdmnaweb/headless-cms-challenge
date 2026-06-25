export function messageForReason(reason?: string): string {
  switch (reason) {
    case 'required':
      return 'This field is required.'
    case 'type':
      return 'This value does not match the field type.'
    case 'reference':
      return 'The referenced item could not be found.'
    default:
      return 'Invalid value.'
  }
}
