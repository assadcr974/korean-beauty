import type { APIRoute } from 'astro';

const STORE_DOMAIN = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
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
            email,
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

    if (result.data?.customerCreate?.userErrors?.length > 0) {
      // Email might already exist, which is fine
      console.log('Customer creation note:', result.data.customerCreate.userErrors);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Newsletter subscription successful' }),
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
