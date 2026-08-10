// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializa el Firebase Admin SDK.
// Si esta función se ejecuta en Firebase Cloud Functions, admin.initializeApp() sin argumentos
// es suficiente y se auto-configura con tu proyecto.
// Si lo ejecutarías localmente o en otro servidor, necesitarías tu serviceAccountKey.json
admin.initializeApp();

exports.listAllUsers = functions.https.onCall(async () => {
  // Opcional: Implementa reglas de seguridad. Por ejemplo, solo permitir administradores.
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
  // }
  // if (context.auth.token.admin !== true) { // Suponiendo un custom claim 'admin'
  //   throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden listar usuarios.');
  // }

  const auth = admin.auth(); // Accede al servicio de autenticación del Admin SDK
  let nextPageToken;
  const users = [];

  try {
    do {
      // Usa el método listUsers del Admin SDK, que puede paginar los resultados
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      listUsersResult.users.forEach((userRecord) => {
        users.push({
          uid: userRecord.uid,
          email: userRecord.email || '',
          displayName: userRecord.displayName || '',
          photoURL: userRecord.photoURL || '',
          phoneNumber: userRecord.phoneNumber || '',
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled,
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
          providers: userRecord.providerData.map(p => p.providerId),
        });
      });
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Se recuperaron ${users.length} usuarios.`);
    return { success: true, users: users };
  } catch (error) {
    console.error('Error al listar usuarios en Cloud Function:', error);
    throw new functions.https.HttpsError(
      'internal',
      'No se pudieron recuperar los usuarios.',
      error.message
    );
  }
});
