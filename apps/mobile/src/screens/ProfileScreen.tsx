import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function ProfileScreen() {
  const { user, logout, switchRole } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!user) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>Entre para gerenciar sua conta.</Text>
        <Pressable
          style={styles.btn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.btnText}>Fazer login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.meta}>{user.email}</Text>
      <Text style={styles.meta}>CPF {user.cpf}</Text>
      <Text style={styles.role}>
        Papel ativo: {user.activeRole === 'PARTNER' ? 'Parceiro' : 'Usuário'}
      </Text>

      <Pressable
        style={styles.btn}
        onPress={() =>
          void switchRole(
            user.activeRole === 'PARTNER' ? 'USER' : 'PARTNER',
          ).catch((e) => Alert.alert('Erro', (e as Error).message))
        }
      >
        <Text style={styles.btnText}>
          Trocar para{' '}
          {user.activeRole === 'PARTNER' ? 'Usuário' : 'Parceiro'}
        </Text>
      </Pressable>

      {user.activeRole === 'PARTNER' || user.roles.includes('PARTNER') ? (
        <>
          <Pressable
            style={styles.secondary}
            onPress={() => navigation.navigate('PartnerInbox')}
          >
            <Text style={styles.secondaryText}>Inbox de solicitações</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() => navigation.navigate('PartnerVenues')}
          >
            <Text style={styles.secondaryText}>Meus locais / CRUD</Text>
          </Pressable>
        </>
      ) : null}

      <Pressable
        style={styles.logout}
        onPress={() =>
          void logout().then(() => navigation.navigate('Welcome'))
        }
      >
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, padding: 20, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { marginTop: 8, color: colors.muted },
  name: { marginTop: 16, fontSize: 20, fontWeight: '700', color: colors.navy },
  meta: { marginTop: 4, color: colors.muted },
  role: { marginTop: 12, fontWeight: '700', color: colors.tealDark },
  btn: {
    marginTop: 24,
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontWeight: '700' },
  secondary: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  secondaryText: { color: colors.navy, fontWeight: '700' },
  logout: { marginTop: 24, alignItems: 'center' },
  logoutText: { color: '#B91C1C', fontWeight: '700' },
});
