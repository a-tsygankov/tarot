/**
 * Request validation helpers for Worker handlers.
 * Returns early Response on failure, null on success.
 */

export interface ValidationRule<T> {
    field: keyof T;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object';
    maxLength?: number;
}

/**
 * Validate a request body against rules. Returns error Response or null.
 */
export function validateBody<T extends Record<string, unknown>>(
    body: T,
    rules: ValidationRule<T>[],
): Response | null {
    const errors: string[] = [];

    for (const rule of rules) {
        const value = body[rule.field];

        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${String(rule.field)} is required`);
            continue;
        }

        if (value !== undefined && value !== null) {
            if (rule.type && typeof value !== rule.type) {
                errors.push(`${String(rule.field)} must be of type ${rule.type}`);
            }
            if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
                errors.push(`${String(rule.field)} exceeds max length of ${rule.maxLength}`);
            }
        }
    }

    if (errors.length > 0) {
        return Response.json(
            { error: 'Validation failed', details: errors },
            { status: 400 },
        );
    }

    return null;
}

/**
 * Safely parse JSON request body. Returns [parsed, null] or [null, errorResponse].
 */
export async function parseJsonBody<T>(request: Request): Promise<[T, null] | [null, Response]> {
    try {
        const contentType = request.headers.get('Content-Type');
        if (!contentType?.includes('application/json')) {
            return [null, Response.json(
                { error: 'Content-Type must be application/json' },
                { status: 415 },
            )];
        }

        const body = await request.json() as T;
        return [body, null];
    } catch {
        return [null, Response.json(
            { error: 'Invalid JSON body' },
            { status: 400 },
        )];
    }
}
