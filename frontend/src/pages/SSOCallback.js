import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SSOCallback() {
  const [searchParams] = useSearchParams();
  const { handleSSOCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    if (accessToken) {
      handleSSOCallback(accessToken);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, handleSSOCallback, navigate]);

  return <div style={{ padding: '2rem', textAlign: 'center' }}>Completing sign-in...</div>;
}

export default SSOCallback;
