import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            defaultSource={require('../../assets/images/logo.png')}
          />
          <Text style={styles.appName}>Dishcovery</Text>
        </View>

        {/* Hero image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/images/welcome-img.png')}
            style={styles.welcomeImage}
            resizeMode="contain"
          />
        </View>

        {/* Text block */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Discover Amazing Food</Text>
          <Text style={styles.subtitle}>
            Find the best restaurants near you, share your food journey, and connect with fellow food lovers.
          </Text>
        </View>

        {/* CTA buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.85}
          >
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: 36,
  },
  logoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF8C42',
    letterSpacing: -0.5,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.38,
  },
  welcomeImage: {
    width: width * 0.85,
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonsContainer: {
    gap: 12,
  },
  getStartedButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  signInButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  signInText: {
    fontSize: 14,
    color: '#666666',
  },
  signInLink: {
    color: '#FF8C42',
    fontWeight: '700',
  },
});