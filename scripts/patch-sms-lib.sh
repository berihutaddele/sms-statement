#!/usr/bin/env bash
set -e
d=node_modules/react-native-get-sms-android/android
m=$d/src/main/AndroidManifest.xml
pkg=$(grep -o 'package="[^"]*"' "$m" | head -1 | cut -d'"' -f2)
sed -i 's/ package="[^"]*"//' "$m"
cat > $d/build.gradle << GRADLE
apply plugin: 'com.android.library'

android {
    namespace "$pkg"
    compileSdk 35
    defaultConfig {
        minSdk 24
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation "com.facebook.react:react-android"
}
GRADLE
echo "Patched with namespace $pkg"
