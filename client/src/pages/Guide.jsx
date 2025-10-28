import React from "react";

const Guide = () => {
  return (
    <>
      <main className="w-full min-h-screen flex flex-row">
        <section className="w-1/6 flex flex-col border-r border-gray-300">
          <nav className="p-10">
            <ul className="space-y-2">
              <li>
                <a
                  href="#introduction"
                  className="text-xl font-medium active:font-bold"
                >
                  Introduction
                </a>
              </li>
              <li>
                <a href="#getting-started" className="text-sm active:font-bold">
                  Getting Started
                </a>
              </li>
              <li>
                <a href="#authentication" className="text-sm active:font-bold">
                  Authentication
                </a>
              </li>
              <li>
                <a href="#link-repo" className="text-sm active:font-bold">
                  Link Repository
                </a>
              </li>
              <li>
                <a href="#create-project" className="text-sm active:font-bold">
                  Create Project
                </a>
              </li>
              <li>
                <a href="#preferences" className="text-sm active:font-bold">
                  Preferences
                </a>
              </li>
              <li>
                <a
                  href="#generate-documentation"
                  className="text-sm active:font-bold"
                >
                  Generate Docs
                </a>
              </li>
              <li>
                <a href="#browse-download" className="text-sm active:font-bold">
                  Browse & Download
                </a>
              </li>
              <li>
                <a href="#demo" className="text-sm active:font-bold">
                  Public Demo
                </a>
              </li>
              <li>
                <a href="#troubleshooting" className="text-sm active:font-bold">
                  Troubleshooting
                </a>
              </li>
              <li>
                <a href="#faq" className="text-sm active:font-bold">
                  FAQs
                </a>
              </li>
            </ul>
          </nav>
        </section>
        <section className="w-5/6 p-10">
          <article id="introduction">
            <div>
              <h1 className="text-3xl font-bold mb-4">Introduction</h1>
              <p className="mb-4">
                Our app is an{" "}
                <span className="font-medium">
                  Automatic Python Codebase Documentation Generator
                </span>{" "}
                that uses a fine tuned CodeT5+ model to create brief
                documentations for Python codebases. The app can be linked to
                your GitHub account where you can create projects using your
                repositories, or you can manually upload files or ZIP folders of
                your projects. You can specify which files to include or
                exclude, as well as choose which functions, classes, and methods
                to be included or excluded as well. The documentation can come
                in 3 formats:{" "}
                <span className="font-medium">HTML, PDF, or Markdown.</span>{" "}
                Multiple revisions of a documentation can be generated in
                various configurations using preferences.
              </p>
              <div className="w-full border-2 border-yellow-200 bg-yellow-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-yellow-700">
                  Note:
                </h2>
                <p>
                  Our app{" "}
                  <span className="font-medium">
                    only accepts Python projects and files.{" "}
                  </span>
                  Uploading any other types of files or using a repo with no
                  Python files will result in our system{" "}
                  <span className="font-medium">ignoring</span> it.
                </p>
              </div>
            </div>
          </article>
          <article id="getting-started" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">Getting Started</h1>
              <p className="mb-4">
                You can start a project using the{" "}
                <span className="font-medium">"Create Project" </span> button
                found in the Dashboard. Additionally, if you are logged in via
                GitHub, the{" "}
                <span className="font-medium">"Link Repository" </span> button
                is made available where you can create a project via a
                repository of your choice.
              </p>
              <p>
                Existing projects are displayed below, indicating their status
                as well as other information. You can view the project's details
                by clicking on them.
              </p>
            </div>
          </article>
          <article id="authentication" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">Authentication</h1>
              <p className="mb-4">
                You can register an account or you can sign in/sign up using
                your GitHub account. The app will ask for necessary permissions
                to gain access to your repositories.
              </p>
              <p className="mb-4">
                If you sign in with GitHub once, the system will automatically
                register you a new account.
              </p>
              <div className="w-full border-2 border-blue-200 bg-blue-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-blue-700">Tip</h2>
                <p>
                  Use <span className="font-medium">GitHub sign-in</span> if you
                  plan to link repositories. Local accounts can still upload
                  files/ZIP.
                </p>
              </div>
            </div>
          </article>
          <article id="link-repo" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">Link Repository</h1>
              <p className="mb-2">
                Dashboard → <span className="font-medium">Link Repository</span>
                . Select a repo and branch, provide a name/description, optional
                tags, then submit to create a project from that branch.
              </p>
              <div className="w-full border-2 border-yellow-200 bg-yellow-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-yellow-700">Note</h2>
                <p>
                  If private repos are missing, re-consent GitHub scopes and
                  ensure you’re signed in with GitHub in this app or double
                  check you are using the correct account.
                </p>
              </div>
            </div>
          </article>
          <article id="create-project" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">Create Project</h1>
              <p className="mb-2">
                Upload one or more <span className="font-medium">.py</span>{" "}
                files or a <span className="font-medium">.zip</span> archive.
                Add tags if needed, then submit. You can upload files later as
                well.
              </p>
              <div className="w-full border-2 border-blue-200 bg-blue-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-blue-700">Info</h2>
                <p>
                  ZIPs are extracted and parsed to build a file tree. Only
                  Python sources are processed for doc generation.
                </p>
              </div>
            </div>
          </article>
          <article id="preferences" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">Preferences</h1>
              <h2 className="text-xl font-bold mb-2">1) Files</h2>
              <p className="mb-2">
                Include/exclude folders and files. Expand the tree, preview
                files, and apply sensible defaults (e.g.,{" "}
                <span className="font-medium">__pycache__</span>,
                <span className="font-medium"> tests</span>).
              </p>
              <h2 className="text-xl font-bold mb-2 mt-4">
                2) Functions / Classes
              </h2>
              <p className="mb-2">
                Fine-tune which functions, classes, and methods to include.
                Counts help estimate generation size.
              </p>
              <h2 className="text-xl font-bold mb-2 mt-4">3) Project</h2>
              <p className="mb-2">
                Choose output format (HTML, Markdown, PDF) and style options,
                then save to finalize.
              </p>
              <div className="w-full border-2 border-blue-200 bg-blue-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-blue-700">Tip</h2>
                <p>
                  Preferences drive the generation plan and reduce noise by
                  excluding irrelevant files and symbols.
                </p>
              </div>
            </div>
          </article>
          <article id="generate-documentation" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">
                Generate Documentation
              </h1>
              <p className="mb-2">
                Start the generation from the project page. Advanced options
                (temperature, top‑p/top‑k) are optional. Progress and status
                (booting/paused) are handled automatically.
              </p>
              <div className="w-full border-2 border-yellow-200 bg-yellow-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-yellow-700">Note</h2>
                <p>
                  On a cold start the model may take time to boot. The app
                  retries and resumes without losing progress; results are saved
                  incrementally.
                </p>
              </div>
            </div>
          </article>
          <article id="browse-download" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">Browse & Download</h1>
              <p className="mb-2">
                Use the documentation browser to view revisions by format, edit
                metadata (title, filename, description), and download
                HTML/Markdown/PDF.
              </p>
              <div className="w-full border-2 border-blue-200 bg-blue-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-blue-700">Info</h2>
                <p>
                  HTML/Markdown preview inline. PDFs are downloaded for viewing.
                </p>
              </div>
            </div>
          </article>
          <article id="demo" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">Public Demo</h1>
              <p className="mb-2">
                On the landing page, paste Python code into the editor and
                generate. The server extracts items and returns cleaned
                docstrings per item.
              </p>
              <div className="w-full border-2 border-blue-200 bg-blue-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-blue-700">Tip</h2>
                <p>
                  The results panel is scrollable and shows item names with
                  their generated docstrings. Use "Try Another" to reset.
                </p>
              </div>
            </div>
          </article>
          <article id="troubleshooting" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">Troubleshooting</h1>
              <ul className="list-disc ml-6 mb-4">
                <li>Private repos not visible: re-consent GitHub scopes.</li>
                <li>
                  Model booting/paused: wait and retry; app handles retries.
                </li>
                <li>
                  Large projects: generation runs in batches and saves progress.
                </li>
                <li>Uploads: only .py files or valid ZIPs are processed.</li>
              </ul>
              <div className="w-full border-2 border-red-200 bg-red-50 h-auto p-5 mb-4">
                <h2 className="text-xl font-bold mb-2 text-red-700">
                  Heads up
                </h2>
                <p>
                  If you cancel generation, you can re-run later; previous
                  revisions remain available.
                </p>
              </div>
            </div>
          </article>
          <article id="faq" className="mt-10">
            <div>
              <h1 className="text-3xl font-bold mb-4">FAQs</h1>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Do I need GitHub?</p>
                  <p>
                    No, GitHub is only used if you want to link your
                    repositories. You can independently upload files without a
                    GitHub account as long as you are registered.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Are private repos supported?</p>
                  <p>Yes, with the correct GitHub consent (repo scope).</p>
                </div>
                <div>
                  <p className="font-medium">Which formats are available?</p>
                  <p>
                    HTML, Markdown, and PDF. You can specify which format your
                    documentation will be in via the finalization page.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>
      </main>
    </>
  );
};

export default Guide;
