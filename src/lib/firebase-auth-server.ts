const FIREBASE_API_KEY = "AIzaSyD_fSnm5mSi8_L-FFQjTgcI632G8fWtrCc";

export interface FirebaseUserVerification {
  phoneNumber?: string;
  localId: string;
}

/**
 * Verifies a Firebase Auth ID Token using Google's secure public endpoint.
 * Returns the verified user information if the token is valid, or null otherwise.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseUserVerification | null> {
  if (!idToken) {
    return null;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firebase accounts:lookup API returned error status:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) {
      console.error("Firebase accounts:lookup returned no users.");
      return null;
    }

    return {
      phoneNumber: user.phoneNumber,
      localId: user.localId,
    };
  } catch (error) {
    console.error("Error verifying Firebase ID token on server:", error);
    return null;
  }
}
