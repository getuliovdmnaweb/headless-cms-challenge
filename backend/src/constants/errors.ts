export const AppErrors = {
  NAME_REQUIRED: { status: 400, error: 'Name is required' },
  FIELDS_REQUIRED: { status: 400, error: 'Add at least one field to continue' },
  CONTENT_TYPE_EXISTS: { status: 409, error: 'A content type with this name already exists' },
  CONTENT_TYPE_NOT_FOUND: { status: 404, error: 'Content type not found' },
  INTERNAL_SERVER_ERROR: { status: 500, error: 'Internal server error' },
} as const
