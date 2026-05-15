import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';

const STORE_DOMAIN = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

// File to track newsletter signups (use env var for production DB)
const NEWSLETTER_DB = path.join(process.cwd(), '.data', 'newsletter-signups.json');

async function getSignedUpEmails(): Promise<Set<string>> {
  try {
    const data = await fs.readFile(NEWSLETTER_DB, 'utf-8');
    const emails = JSON.parse(data) as string[];
    return new Set(emails);
  } catch {
    return new Set();
  }
}

async function addSignedUpEmail(email: string): Promise<void> {
  try {
    await fs.mkdir(path.dirname(NEWSLETTER_DB), { recursive: true });
    const signedUp = await getSignedUpEmails();
    signedUp.add(email.toLowerCase());
    await fs.writeFile(NEWSLETTER_DB, JSON.stringify(Array.from(signedUp), null, 2));
  } catch (error) {
    console.error('Failed to save signup:', error);
  }
}

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const signedUp = await getSignedUpEmails();

    // Check if email already used the promotion
    if (signedUp.has(normalizedEmail)) {
      return new Response(
        JSON.stringify({
          error: 'Email already used',
          message: 'Cet email a déjà reçu la réduction de bienvenue.'
        }),
        { status: 409 }
      );
    }

    // Subscribe to Shopify Customer API
    const response = await fetch(`https://${STORE_DOMAIN}/api/2026-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
      },
      body: JSON.stringify({
        query: `
          mutation createCustomer($input: CustomerCreateInput!) {
            customerCreate(input: $input) {
              customer {
                id
                email
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            email: normalizedEmail,
            acceptsMarketing: true,
          },
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('Shopify error:', result.errors);
      return new Response(
        JSON.stringify({ error: 'Failed to subscribe' }),
        { status: 500 }
      );
    }

    // Record this email as having used the promotion
    await addSignedUpEmail(normalizedEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Newsletter subscription successful',
        discountCode: 'BIENVENUE10'
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Newsletter API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
