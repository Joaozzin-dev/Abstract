# Loja do Tonho — APP (Expo)

App no **celular** (Expo Go). Bloco 1+2: perfil, temas, AsyncStorage, Firebase.

## Instalar e rodar

```bash
cd loja-tonho-app
npm install
npx expo start
```

No telefone: **Expo Go** + USB `adb reverse tcp:8081 tcp:8081`.

## Firebase

Copie `.env.example` → `.env` (já com projeto poema-cef47).

Variáveis: `EXPO_PUBLIC_FIREBASE_*`

No console Firebase, ative **Email/Password** em Authentication.
Publique `firestore.rules`.

## O que este bloco adiciona

- Login/cadastro Firebase ou modo local
- Termos LGPD + menor de idade
- Perfil (nome, foto, pontos, ofensiva)
- Temas: escuro, claro, alto contraste, daltônico
- Tamanho de texto
- Persistência AsyncStorage
- Sync Firestore quando logado
