import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const verifyTurnstile = async (req, res, next) => {
  const { turnstileToken } = req.body;

  if (!turnstileToken) {
    return res.status(400).json({
      error: 'Turnstile token is required',
      field: 'turnstileToken'
    });
  }

  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: req.ip
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.success) {
      return res.status(400).json({
        error: 'Turnstile verification failed',
        details: response.data['error-codes']
      });
    }

    // Vérification réussie, continuer
    next();
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return res.status(500).json({
      error: 'Failed to verify Turnstile token'
    });
  }
};
