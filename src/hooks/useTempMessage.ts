import { useState } from 'react';
import { TIMING } from '../lib/constants';

export function useTempMessage(duration = TIMING.MESSAGE_AUTO_DISMISS): [string, (msg: string) => void] {
  const [message, setMessage] = useState('');

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  };

  return [message, showMessage];
}
