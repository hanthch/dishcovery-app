import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
  onComplete?: () => void;
}

export default function WelcomeScreen({ navigation, onComplete }: WelcomeScreenProps) {
  const handleGetStarted = () => {
    if (onComplete) onComplete();
    navigation.navigate('Auth', { screen: 'SignIn' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Food Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../assets/images/welcome-food.png')} // Your food illustration
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Welcome to Dishcovery</Text>
          <Text style={styles.subtitle}>
            Discover great places to eat with your friends
          </Text>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedText}>Get started</Text>
        </TouchableOpacity>

        {/* Bottom indicator */}
        <View style={styles.bottomIndicator} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  illustrationContainer: {
    width: width - 48,
    height: height * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF8C42',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  getStartedButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF8C42',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 150,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF8C42',
    textAlign: 'center',
  },
  bottomIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
});