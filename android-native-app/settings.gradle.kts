import java.io.File

pluginManagement {
    val rnGradlePluginPath = File(
        providers.exec {
            workingDir(rootDir.parentFile)
            commandLine(
                "node",
                "--print",
                "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })"
            )
        }.standardOutput.asText.get().trim()
    ).parentFile.absolutePath
    includeBuild(rnGradlePluginPath)

    val expoAutolinkingPath = File(
        providers.exec {
            workingDir(rootDir.parentFile)
            commandLine(
                "node",
                "--print",
                "require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })"
            )
        }.standardOutput.asText.get().trim()
    )
    val expoGradlePluginPath = File(expoAutolinkingPath, "../android/expo-gradle-plugin").absolutePath
    includeBuild(expoGradlePluginPath)

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

expoAutolinking.projectRoot = rootDir.parentFile

extensions.configure<com.facebook.react.ReactSettingsExtension> {
    autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
}
expoAutolinking.useExpoModules()
expoAutolinking.useExpoVersionCatalog()

rootProject.name = "MyApp"
include(":app")
includeBuild(expoAutolinking.reactNativeGradlePlugin)
