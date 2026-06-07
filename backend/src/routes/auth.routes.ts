import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { APIError } from 'better-auth/api';
import { auth } from '../middleware/auth.js';
import type { AuthType } from '../middleware/auth.js';
import { registerBodySchema, loginBodySchema, messageResponseSchema, forgotPasswordBodySchema, resetPasswordBodySchema, changePasswordBodySchema } from '../schemas/auth.schema.js';
import { createAuthError, resolveApiErrorStatus, AppError } from '../middleware/errorHandler.js';

export const authRoutes = new Hono<{ Variables: AuthType }>();

// Strips sensitive data from validation error responses
const secureValidationHook = (result: any, c: any) => {
  if (!result.success) {
    const safeData = result.data ? { ...result.data } : {};
    // Delete cleartext passwords before returning to the client
    delete safeData.password;
    delete safeData.newPassword;

    return c.json({
      success: false,
      error: result.error.issues || result.error,
      // data: safeData
    }, 400);
  }
};

// POST /register - Register a new user account
authRoutes.post(
  '/register',
  describeRoute({
    tags: ['Auth'],
    description: 'Register a new user account',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          example: {
            email: 'user@example.com',
            name: 'John Doe',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Registration result',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Registration successful' },
          },
        },
      },
      400: { description: 'Invalid payload or content type' },
    },
  }),
  validator('json', registerBodySchema, secureValidationHook),
  async (c: any) => {
  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }
  const user = c.get('user');
  if (user) {
    return c.json({ message: 'Already logged in', user, session: c.get('session') });
  }

  const body = c.req.valid('json');

  try {
    // auth.api.isUsernameAvailable({ query: { username: body.username } }) // optionally check username availability before registration
    const result = await auth.api.signUpEmail({
      body: {
        email: body.email,
        password: body.password,
        name: body.name ?? body.email.split('@')[0] ?? 'User',
        // callbackURL:
      },
    });

    return c.json({
      message: 'Registration successful',
      user: result.user,
    });
  } catch (error: any) {
    if (error instanceof APIError) {
      throw new AppError(error.message, resolveApiErrorStatus(error));
    }
    console.error('[Auth Route Error]:', error);
    throw createAuthError('An unexpected server error occurred during registration. Please try again later.', error);
  }
  }
);


// POST /login - Log in with credentials and receive session token
authRoutes.post(
  '/login',
  describeRoute({
    tags: ['Auth'],
    description: 'Log in with credentials. Copy the sessionToken from response, click Authorize 🔓 at the top, and paste it in the bearerAuth field to authenticate other endpoints.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          example: {
            email: 'user@example.com',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login result',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Login successful' },
          },
        },
        headers: {
          'Set-Cookie': {
            description: 'Session cookie set for browser-based clients',
            schema: { type: 'string' },
          },
          'set-auth-token': {
            description: 'Session token for Bearer authentication (use as: Authorization: Bearer <token>)',
            schema: { type: 'string' },
          },
        },
      },
      400: { description: 'Invalid content type' },
      401: { description: 'Invalid credentials' },
    },
  }),
  validator('json', loginBodySchema, secureValidationHook),
  async (c: any) => {
  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }

  const user = c.get('user');
  const session = c.get('session');

  if (user) {
    return c.json({ message: 'Already logged in', user, session });
  }

  const body = c.req.valid('json');

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: body.email,
        password: body.password,
        rememberMe: true,
        // callbackURL:
      },
      headers: c.req.raw.headers,
    });

    // Set session cookie for browser-based clients
    const isDev = process.env.NODE_ENV !== 'production';
    if (result.token) {
      const cookieParts = [
        `better-auth.session_token=${result.token}`,
        'Path=/',
        'HttpOnly',
        `SameSite=${isDev ? 'Lax' : 'None'}`,
      ];
      if (!isDev) cookieParts.push('Secure');
      c.header('Set-Cookie', cookieParts.join('; '));

      // Bearer plugin convention — clients read this header to store the token
      c.header('set-auth-token', result.token);
    }

    return c.json({
      message: 'Login successful',
      user: result.user,
      sessionToken: result.token,  // token for Bearer auth (Authorization: Bearer <token>)
    });
  } catch (error: any) {
    if (error instanceof APIError) {
      throw new AppError(error.message, resolveApiErrorStatus(error));
    }
    console.error('[Auth Route Error]:', error);
    throw createAuthError('An unexpected server error occurred during login. Please try', error);
  }
  }
);


// POST /logout - Log out and revoke the current session
authRoutes.post(
  '/logout',
  describeRoute({
    tags: ['Auth'],
    description: 'Log out and revoke the current session',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Logout result',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Logout successful' },
          },
        },
      },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c: any) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    await auth.api.signOut({
      headers: c.req.raw.headers,
    });

    return c.json({ message: 'Logout successful' });
  } catch (error: any) {
    if (error instanceof APIError) {
      throw new AppError(error.message, resolveApiErrorStatus(error));
    }
    console.error('[Auth Route Error]:', error);
    throw createAuthError('An unexpected server error occurred during logout. Please try again.', error);
  }
  }
);


// POST /forgot-password - Initiate password reset process by sending a reset email
authRoutes.post(
  '/forgot-password',
  describeRoute({
    tags: ['Auth'],
    description: 'Initiate password reset process by sending a reset email',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          example: {
            email: 'user@example.com',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset email sent',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Password reset email sent' },
          },
        },
      },
      400: { description: 'Invalid payload or content type' },
    },
  }),
  validator('json', forgotPasswordBodySchema, secureValidationHook),
  async (c: any) => {
  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }

  const body = c.req.valid('json');

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: body.email,
        // redirectTo: "https://localhost:5174/reset-password",
      },
    });
    return c.json({ message: 'Password reset email sent' });
  } catch (error: any) {
    if (error instanceof APIError) {
      throw new AppError(error.message, resolveApiErrorStatus(error));
    }
    console.error('[Auth Route Error]:', error);
    throw createAuthError('An unexpected server error occurred during password reset. Please try again.', error);
  }
  }
);


// POST /reset-password - Complete password reset process by providing new password and reset token
authRoutes.post(
  '/reset-password',
  describeRoute({
    tags: ['Auth'],
    description: 'Complete password reset process by providing new password and reset token',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          example: {
            token: 'reset_token_here',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset successful',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Password reset successful' },
          },
        },
      },
      400: { description: 'Invalid payload or content type' },
    },
  }),
  validator('json', resetPasswordBodySchema, secureValidationHook),
  async (c: any) => {
    if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
      return c.json({ error: 'Content-Type must be application/json' }, 400);
    }

    const body = c.req.valid('json');

    try {
      await auth.api.resetPassword({
        body: {
          token: body.token,
          newPassword: body.newPassword,
        },
      });
      return c.json({ message: 'Password reset successful' });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw new AppError(error.message, resolveApiErrorStatus(error));
      }
      console.error('[Auth Route Error]:', error);
      throw createAuthError('An unexpected server error occurred during password reset. Please try again.', error);
    }
  }
);


// GET /me - Get the authenticated user profile and session info
authRoutes.get(
  '/me',
  describeRoute({
    tags: ['Auth'],
    description: 'Get the authenticated user profile and session info',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Authenticated user profile and session info',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: {
              message: 'Authenticated user profile and session info',
              user: { id: 'user_123', email: 'user@example.com' },
              session: { id: 'session_123', expiresAt: '2026-01-01T00:00:00.000Z' },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c: any) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const session = c.get('session');

      return c.json({
        message: 'Authenticated user profile and session info',
        user,
        session,
      });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw new AppError(error.message, resolveApiErrorStatus(error));
      }
      console.error('[Auth Route Error]:', error);
      throw createAuthError('Failed to get authenticated user profile and session info', error);
    }
  }
);


// POST /change-password - Change user password
authRoutes.post(
  '/change-password',
  describeRoute({
    tags: ['Auth'],
    description: 'Change the authenticated user\'s password',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      200: {
        description: 'Password changed successfully',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Password changed successfully' },
          },
        },
      },
      400: { description: 'Invalid payload or password requirements not met' },
      401: { description: 'Unauthorized' },
    },
  }),
  validator('json', changePasswordBodySchema, secureValidationHook),
  async (c: any) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = c.req.valid('json');

    try {
      await auth.api.changePassword({
        body: {
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
          revokeOtherSessions: body.revokeOtherSessions ?? false,
        },
        headers: c.req.raw.headers,
      });

      return c.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw new AppError(error.message, resolveApiErrorStatus(error));
      }
      console.error('[Auth Route Error]:', error);
      throw createAuthError('Failed to change password. Please ensure your current password is correct.', error);
    }
  }
);
