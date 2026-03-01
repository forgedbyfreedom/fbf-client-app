import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { Input } from '../ui/Input';
import { PhotoUpload } from './PhotoUpload';
import { spacing } from '../../lib/theme';

export function StepNotes() {
  const { form, updateForm } = useContext(CheckinContext);

  return (
    <View>
      <Input
        label="General Notes"
        value={form.general_notes}
        onChangeText={(t) => updateForm({ general_notes: t })}
        placeholder="Anything else your coach should know..."
        multiline
        numberOfLines={5}
        containerStyle={styles.field}
        style={styles.multiline}
      />

      <PhotoUpload
        photos={form.progress_photo_urls}
        onChange={(photos) => updateForm({ progress_photo_urls: photos })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
