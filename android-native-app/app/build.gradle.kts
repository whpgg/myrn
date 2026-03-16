plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.facebook.react")
}

val hostProjectRoot = rootDir.parentFile.absolutePath
val enableMinifyInRelease = (findProperty("android.enableMinifyInReleaseBuilds")?.toString()?.toBoolean()) ?: false
val hermesEnabled = (findProperty("hermesEnabled")?.toString()?.toBoolean()) ?: true

configure<com.facebook.react.ReactExtension> {
    root.set(file(hostProjectRoot))
    entryFile.set(file("$hostProjectRoot/index.js"))
    reactNativeDir.set(file("$hostProjectRoot/node_modules/react-native"))
    codegenDir.set(file("$hostProjectRoot/node_modules/@react-native/codegen"))
    autolinkLibrariesWithApp()
}

android {
    namespace = "com.example.myapp"
    compileSdk = 34
    ndkVersion = "27.1.12297006"

    defaultConfig {
        applicationId = "com.example.myapp"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        buildConfigField("boolean", "IS_NEW_ARCHITECTURE_ENABLED", "false")
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = enableMinifyInRelease
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }

    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    if (hermesEnabled) {
        implementation("com.facebook.react:hermes-android")
    } else {
        implementation("io.github.react-native-community:jsc-android:2026004.+")
    }
}
