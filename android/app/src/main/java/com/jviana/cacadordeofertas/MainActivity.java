package com.jviana.cacadordeofertas;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Browser;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final String BASE_HOST = "grey-spider-486365.hostingersite.com";
    private static final String START_URL = "https://" + BASE_HOST + "/products";
    private static final int FILE_PICK_REQUEST = 701;
    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(11, 18, 32));
        getWindow().setNavigationBarColor(Color.rgb(11, 18, 32));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(11, 18, 32));
        webView = new WebView(this);
        frame.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ));
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setIndeterminate(true);
        FrameLayout.LayoutParams barParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 7, Gravity.TOP
        );
        frame.addView(progressBar, barParams);
        setContentView(frame);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_PICK_REQUEST);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "Nenhum seletor de arquivo disponível", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if ("https".equalsIgnoreCase(uri.getScheme()) && BASE_HOST.equalsIgnoreCase(host)) {
                    return false;
                }
                openExternal(uri);
                return true;
            }
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(MainActivity.this,
                        "Sem conexão com o Caçador. Confira a internet e tente novamente.",
                        Toast.LENGTH_LONG).show();
                }
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long contentLength) {
                try {
                    Uri uri = Uri.parse(url);
                    if (!"https".equalsIgnoreCase(uri.getScheme())) {
                        Toast.makeText(MainActivity.this, "Download não seguro bloqueado", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    DownloadManager.Request request = new DownloadManager.Request(uri);
                    request.setMimeType(mimeType);
                    request.addRequestHeader("User-Agent", userAgent);
                    String cookies = CookieManager.getInstance().getCookie(url);
                    if (cookies != null) request.addRequestHeader("Cookie", cookies);
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                    DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    manager.enqueue(request);
                    Toast.makeText(MainActivity.this, "Salvando em Downloads", Toast.LENGTH_SHORT).show();
                } catch (Exception ex) {
                    Toast.makeText(MainActivity.this, "Não foi possível iniciar o download", Toast.LENGTH_LONG).show();
                }
            }
        });

        if (state != null) {
            webView.restoreState(state);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    private void openExternal(Uri uri) {
        try {
            String scheme = uri.getScheme();
            if (scheme == null) return;
            if (!scheme.equalsIgnoreCase("https") && !scheme.equalsIgnoreCase("http")
                && !scheme.equalsIgnoreCase("mailto") && !scheme.equalsIgnoreCase("tel")
                && !scheme.equalsIgnoreCase("whatsapp")) return;
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.putExtra(Browser.EXTRA_APPLICATION_ID, getPackageName());
            startActivity(intent);
        } catch (ActivityNotFoundException ex) {
            Toast.makeText(this, "Nenhum aplicativo pode abrir esse link", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_PICK_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            );
            fileCallback = null;
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        if (webView != null) webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    protected void onDestroy() {
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
