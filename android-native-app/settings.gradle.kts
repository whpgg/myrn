import java.io.File

pluginManagement {
    val rnGradlePluginPath = File(rootDir.parentFile, "node_modules/@react-native/gradle-plugin")
    if (rnGradlePluginPath.exists()) {
        includeBuild(rnGradlePluginPath.absolutePath)
    }

    val expoAutolinkingPath = File(rootDir.parentFile, "node_modules/expo-modules-autolinking")
    val expoGradlePluginPath = File(expoAutolinkingPath, "android/expo-gradle-plugin")
    if (expoGradlePluginPath.exists()) {
        includeBuild(expoGradlePluginPath.absolutePath)
    }

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("com.facebook.react.settings")
    id("expo-autolinking-settings")
}

extensions.configure<com.facebook.react.ReactSettingsExtension> {
    autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
}
expoAutolinking.useExpoModules()
expoAutolinking.useExpoVersionCatalog()

rootProject.name = "MyApp"
include(":app")
includeBuild("../node_modules/@react-native/gradle-plugin")
