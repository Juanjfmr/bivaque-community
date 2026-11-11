/**
 * Native controls for Bivaque.
 * @expo/ui maps to Jetpack Compose on Android and SwiftUI on iOS.
 * No WebView, no faux sheet constructed with React Native Modal.
 * Product images, editorial surfaces and grids remain RN-owned.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import {
  BottomSheet,
  Button,
  Column,
  Host,
  ScrollView as NativeScrollView,
  Text as NativeText,
} from '@expo/ui';

type ChoiceProps<T extends string> = {
  title: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  testID?: string;
};

export function NativeChoice<T extends string>({
  title, value, options, onChange, testID,
}: ChoiceProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <View testID={testID} style={{ minHeight: 48 }}>
      <Host matchContents>
        <Button
          label={value}
          variant="outlined"
          onPress={() => setOpen(true)}
        />
        <BottomSheet
          isPresented={open}
          onDismiss={() => setOpen(false)}
          snapPoints={['half', 'full']}
        >
          <NativeScrollView>
            <Column spacing={10}>
              <NativeText textStyle={{ fontSize: 18, fontWeight: '700' }}>{title}</NativeText>
              {options.map((option) => (
                <Button
                  key={option}
                  label={option === value ? '✓  ' + option : option}
                  variant={option === value ? 'filled' : 'outlined'}
                  onPress={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                />
              ))}
              <Button label="Fechar" variant="text" onPress={() => setOpen(false)} />
            </Column>
          </NativeScrollView>
        </BottomSheet>
      </Host>
    </View>
  );
}

type MarketFilterProps<T extends string> = {
  kind: T;
  kinds: readonly T[];
  onKind: (kind: T) => void;
  neighborhood: string;
  neighborhoods: string[];
  onNeighborhood: (name: string) => void;
};

export function NativeMarketFilters<T extends string>({
  kind, kinds, onKind, neighborhood, neighborhoods, onNeighborhood,
}: MarketFilterProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ minHeight: 52 }} testID="native-market-filters">
      <Host matchContents>
        <Button
          label={'Filtros  ·  ' + (kind === 'Todos' ? 'Tudo' : kind) + '  ·  ' + neighborhood}
          variant="outlined"
          onPress={() => setOpen(true)}
        />
        <BottomSheet
          isPresented={open}
          onDismiss={() => setOpen(false)}
          snapPoints={['half', 'full']}
        >
          <NativeScrollView>
            <Column spacing={8}>
              <NativeText textStyle={{ fontSize: 19, fontWeight: '700' }}>Refine sua busca</NativeText>
              <NativeText textStyle={{ fontSize: 14 }}>O que você procura?</NativeText>
              {kinds.map((k) => (
                <Button
                  key={k}
                  label={(k === kind ? '✓  ' : '') + k}
                  variant={k === kind ? 'filled' : 'outlined'}
                  onPress={() => onKind(k)}
                />
              ))}
              <NativeText textStyle={{ fontSize: 14 }}>Onde?</NativeText>
              {neighborhoods.map((n) => (
                <Button
                  key={n}
                  label={(n === neighborhood ? '✓  ' : '') + n}
                  variant={n === neighborhood ? 'filled' : 'outlined'}
                  onPress={() => onNeighborhood(n)}
                />
              ))}
              <Button label="Ver resultados" onPress={() => setOpen(false)} />
            </Column>
          </NativeScrollView>
        </BottomSheet>
      </Host>
    </View>
  );
}
