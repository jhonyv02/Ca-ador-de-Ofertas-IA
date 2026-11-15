# Caçador de Ofertas IA — Android

App Android leve que abre a versão online em https://grey-spider-486365.hostingersite.com/products.

- Android 8.0 ou superior (API 26+)
- Login e sessões via WebView; arquivos via seletor do Android
- Links de Hotmart, Meta e externos abrem no navegador do celular
- Downloads são enviados à pasta Downloads
- Internet necessária; alterações do site aparecem no app após publicação
- APK assinado automaticamente como build **de teste** (debug), não pela chave de publicação Play Store
- Login via Google pode não funcionar dentro de WebViews; prefira e-mail e senha.
- Acesso depende do site Hostinger e Supabase estarem disponíveis.

Compile com Android SDK 35 + Java 17 + Gradle 8.10.2:

```sh
gradle -p android assembleDebug
```

O workflow .github/workflows/android-apk.yml compila e publica o arquivo em GitHub Releases quando os arquivos Android forem atualizados.
