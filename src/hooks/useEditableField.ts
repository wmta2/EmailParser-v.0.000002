import { useState } from 'react';

export function useEditableField<T>(initialValue: T) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState<T>(initialValue);

  const startEditing = () => {
    setTempValue(initialValue);
    setIsEditing(true);
  };

  const cancel = () => {
    setTempValue(initialValue);
    setIsEditing(false);
  };

  const save = (onSave: (value: T) => void) => {
    onSave(tempValue);
    setIsEditing(false);
  };

  return { isEditing, tempValue, setTempValue, startEditing, cancel, save };
}
