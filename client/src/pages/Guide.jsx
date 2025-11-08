import React, { useState, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa";

const NoteBox = ({
  type = "note", // "note" | "tip" | "warning"
  title,
  children,
  highlights = [],
}) => {
  // Color mapping
  const colorMap = {
    note: {
      border: "border-yellow-200",
      bg: "bg-yellow-50",
      title: "text-yellow-700",
    },
    tip: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      title: "text-blue-700",
    },
    warning: {
      border: "border-red-200",
      bg: "bg-red-50",
      title: "text-red-700",
    },
  };
  const color = colorMap[type] || colorMap.note;

  // Highlight function
  const highlightText = (text) => {
    if (!highlights || highlights.length === 0) return text;
    // Split and wrap highlights
    let parts = [text];
    highlights.forEach((h) => {
      let newParts = [];
      parts.forEach((part) => {
        if (typeof part === "string" && part.includes(h)) {
          const split = part.split(h);
          split.forEach((s, i) => {
            if (s) newParts.push(s);
            if (i < split.length - 1)
              newParts.push(
                <span key={h + i} className="font-medium">
                  {h}
                </span>
              );
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });
    return parts;
  };

  return (
    <div
      className={`w-full border-2 ${color.border} ${color.bg} h-auto p-5 mb-4`}
    >
      <h2 className={`text-xl font-bold mb-2 ${color.title}`}>{title}</h2>
      <p>{highlightText(children)}</p>
    </div>
  );
};

const Guide = () => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const mainSection = document.querySelector(".guide-content");
      const scrollTop = mainSection ? mainSection.scrollTop : window.scrollY;
      if (scrollTop > 300) setShowScrollButton(true);
      else setShowScrollButton(false);
    };

    const mainSection = document.querySelector(".guide-content");
    if (mainSection) mainSection.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScroll);
    return () => {
      if (mainSection) mainSection.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    const mainSection = document.querySelector(".guide-content");
    if (mainSection) {
      mainSection.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <main className="w-full min-h-screen flex flex-row max-md:flex-col">
        <section className="w-1/6 flex flex-col border-r border-gray-300 max-md:w-full max-md:border-r-0 max-md:border-b">
          <nav className="p-10 max-md:p-4 sm:px-6 md:px-8">
            <ul className="space-y-2 max-md:space-y-1">
              <li>
                <a
                  href="#introduction"
                  className="text-xl font-medium active:font-bold max-md:text-base"
                >
                  Introduction
                </a>
              </li>
              <li>
                <a
                  href="#getting-started"
                  className="text-sm active:font-bold max-md:text-sm"
                >
                  Getting Started
                </a>
              </li>
              <li>
                <a
                  href="#starting-your-project"
                  className="text-sm active:font-bold max-md:text-sm"
                >
                  Starting your Project
                </a>
              </li>
              <li>
                <a
                  href="#using-preferences"
                  className="text-sm active:font-bold max-md:text-sm"
                >
                  Using Preferences
                </a>
              </li>
              <li className="mb-4 max-md:mb-2">
                <a
                  href="#generating-documentation"
                  className="text-sm active:font-bold max-md:text-sm"
                >
                  Generating Documentation
                </a>
              </li>
              <li>
                <a
                  href="#preferences"
                  className="text-xl font-medium active:font-bold max-md:text-base"
                >
                  Preferences
                </a>
              </li>
              <li>
                <a
                  href="#file-preferences"
                  className="text-sm active:font-bold max-md:text-sm"
                >
                  File Preferences
                </a>
              </li>
              <li>
                <a
                  href="#function-class-preferences"
                  className="text-sm active:font-bold max-md:text-sm"
                >
                  Function/Class Preferences
                </a>
              </li>
              <li>
                <a
                  href="#documentation-preferences"
                  className="text-sm active:font-bold max-md:text-sm"
                >
                  Documentation Preferences
                </a>
              </li>
              <li>
                <a
                  href="#faqs"
                  className="text-xl font-medium active:font-bold max-md:text-base"
                >
                  FAQs
                </a>
              </li>
            </ul>
          </nav>
        </section>
        <section className="w-5/6 p-10 h-screen overflow-y-scroll max-md:w-full max-md:p-6 max-md:h-auto sm:px-10 md:px-12 guide-content relative">
          <article id="#introduction">
            <div>
              <h1 className="text-4xl font-bold mb-4 border-b-2 border-gray-300 py-5">
                Introduction
              </h1>
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
              <NoteBox
                type="note"
                title="Note"
                highlights={[
                  "only accepts Python projects and files.",
                  "ignoring",
                ]}
              >
                Our app only accepts Python projects and files. Uploading any
                other types of files or using a repo with no Python files will
                result in our system ignoring it.
              </NoteBox>
            </div>
          </article>
          <article id="getting-started" className="mt-10">
            <div>
              <h1 className="text-3xl font-semibold mb-4">Getting Started</h1>
              <p className="mb-4">
                To get started with our app, you need to create an account by
                signing up with your email address or using your GitHub account.
                Once you have created an account, you can log in to your
                dashboard.
              </p>
            </div>
            <NoteBox type="tip" title="Tip" highlights={["once"]}>
              Signing in once using GitHub automatically registers you in our
              system so you can directly sign up via the Login page instead.
            </NoteBox>
          </article>
          <article id="starting-your-project" className="mt-10">
            <div>
              <h1 className="text-3xl font-semibold mb-4">
                Starting your Project
              </h1>
              <p className="mb-4">
                After logging in, you can start a new project by clicking the{" "}
                <span className="font-medium">"Create Project" </span> button or
                by clicking the{" "}
                <span className="font-medium">"Link Repository"</span> button to
                link your GitHub repository if you are signed in with GitHub.
                This option is otherwise greyed out if you are signed in with an
                email account.
              </p>
              <p className="mb-6">
                Once in the project creation page, you can provide a title,
                description and optional tags. From here, you can also start
                uploading files to your project as well.
              </p>
              <NoteBox type="tip" title="Quick Test">
                For a quick test, feel free to download this test zip we've
                created for your first run.
              </NoteBox>
              <a
                className="inline-block mb-10 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                href={`${import.meta.env.VITE_API_URL}/public/test-zip`}
                target="_blank"
                rel="noreferrer"
              >
                Download test-zip.zip
              </a>
              <h2 className="text-xl font-medium mb-3">Uploading Files</h2>
              <p className="mb-4">
                You can upload ZIP files of your project, or multiple files, or
                just a single file. Only Python files will be accepted by the
                system, and the rest are to be discarded.
              </p>
              <NoteBox
                type="note"
                title="Note"
                highlights={["never", "discard"]}
                className="mb-6"
              >
                To minimize space consumption, our system never stores your
                files in our database. It only extracts necessary metadata such
                as functions, classes and methods and proceeds to discard each
                file after processing.
              </NoteBox>
              <h2 className="text-xl font-medium mb-3">Using Repositories</h2>
              <p className="mb-4">
                When using a repository to upload files, you must select which
                branch to fetch. The system will then proceed look for this
                branch and gather it's python files. Please note that large
                branches may take a while to process.
              </p>
              <div className="mt-6"></div>
            </div>
          </article>
          <article id="using-preferences" className="mt-10">
            <div>
              <h1 className="text-3xl font-semibold mb-4">Using Preferences</h1>
              <p className="mb-4">
                Preferences allow you to customize how the documentation is
                generated. You can choose to include or exclude specific files,
                functions, classes, and methods from the documentation. Using
                preferences, you can set the following options:
              </p>
              <ul className="list-disc list-inside mb-4 flex gap-y-2 flex-col font-medium">
                <li>File Inclusion/Exclusions</li>
                <li>Function Inclusion/Exclusions</li>
                <li>Class Inclusion/Exclusions</li>
                <li>Method Inclusion/Exclusions</li>
                <li>Documentation Format (HTML, PDF, Markdown)</li>
                <li>
                  Generation Paramaters like Temperature, Top P, and Top K
                </li>
              </ul>
              <p className="mb-4">
                Preferences are step by step — you{" "}
                <span className="italic">must</span> set the File preferences
                first before proceeding with the other preferences. This way,
                the other two preferences can be narrowed down to the files
                included.
              </p>
              <p className="mb-4">
                For a more in depth explanation of what each preference does,
                please refer to the{" "}
                <a href="#preferences" className="text-blue-700 font-medium">
                  Preferences
                </a>{" "}
                section.
              </p>
            </div>
          </article>
          <article id="generating-documentation" className="mt-10">
            <div>
              <h1 className="text-3xl font-semibold mb-4">
                Generating Documentation
              </h1>
              <p className="mb-4">
                Once you have set your preferences, you will proceed with
                finalizing your options. Once finalized, you can proceed to
                generate the documentation by clicking the{" "}
                <span className="font-medium">"Generate"</span> button. The
                system will then process your project based on the preferences
                you have set and generate the documentation in the specified
                format.
              </p>
            </div>
            <NoteBox
              type="tip"
              title="Tip"
              highlights={["may take a while", "large projects"]}
            >
              Your project can generate multiple revisions of it's
              documentation. Feel free to play around with varying
              configurations to suit your project's needs. Additionally, you can
              set the documentation's own title and description independent of
              the project's title and description itself.
            </NoteBox>
            <NoteBox
              type="note"
              title="Note"
              highlights={["scaled down to zero"]}
            >
              Generating documentation for large projects may take a while as
              our model is scaled down to zero once it has been inactive for a
              while to save costs. Please be patient while the documentation is
              being generated.
            </NoteBox>
          </article>
          <article id="preferences" className="mt-10">
            <div>
              <h1 className="text-4xl font-bold mb-4 border-b-2 border-gray-300 py-5">
                Preferences
              </h1>
              <p className="mb-4">
                Preferences makes up the heart of your documentation's template.
                It allows you fine-grain control over what shows up in the
                documentation, how it's generated and the format it's created
                in. Additionally, preferences can be altered for each revision
                of your project's documentation. This allows the user
                flexibility in suiting the needs of their projects.
              </p>
            </div>
            <NoteBox
              type="warning"
              title="Warning"
              highlights={["only saved", "all files"]}
            >
              Please make sure to click the "Save and Continue" button whenever
              you are done setting your preferences as preferences are only
              saved once you have clicked this button. Failure to click Save and
              Continue will result in having set no preferences, though our Step
              by Step progress does indicate this.
            </NoteBox>
          </article>
          <article id="file-preferences" className="mt-10">
            <div>
              <h1 className="text-3xl font-semibold mb-4">File Preferences</h1>
              <p className="mb-4">
                File Preferences allows you to include or exclude specific files
                from your project when generating documentation. This is useful
                when you have files that are not relevant to the documentation
                or when you want to focus on specific files.
              </p>
            </div>
            <NoteBox
              type="tip"
              title="Tip"
              highlights={["automatically", "manually change"]}
            >
              Unchecking/Excluding directories automatically exclude each file
              and directory inside it. However, users are still allowed to
              manually change this.
            </NoteBox>
          </article>
          <article id="function-class-preferences" className="mt-10">
            <div>
              <h1 className="text-3xl font-semibold mb-4">
                Function/Class Preferences
              </h1>
              <p className="mb-4">
                Function Preferences allows you to include or exclude specific
                functions, classes, and methods from your project when
                generating documentation. You can set a file's function/class
                preferences in the Function/Class preference step by clicking on
                the file itself on the left-hand window.
              </p>
              <p className="mb-4">
                Much like in the File Preferences, this time, excluding a Class
                will also exclude all of it's children methods. Manual changes
                are also still allowed.
              </p>
            </div>
          </article>
          <article id="documentation-preferences" className="mt-10">
            <div>
              <h1 className="text-3xl font-semibold mb-4">
                Documentation Preferences
              </h1>
              <p className="mb-4">
                Documentation Preferences allows you to set the format of the
                generated documentation as well as the generation parameters
                used by the model. You can choose between HTML, PDF, and
                Markdown formats. You can also set the Temperature, Top P, and
                Top K parameters to control the randomness and diversity of the
                generated documentation.
              </p>
            </div>
            <h2 className="text-xl font-medium mb-3">Generation Parameters</h2>
            <ul className="list-disc list-inside mb-4 flex gap-y-2 flex-col">
              <li>
                <span className="font-medium">Temperature:</span> Controls the
                randomness of the generated text. A higher temperature results
                in more random text, while a lower temperature results in more
                conservative text.
              </li>
              <li>
                <span className="font-medium">Top P:</span> Controls the
                diversity of the generated text. A higher Top P results in more
                diverse text, while a lower Top P results in more focused text.
              </li>
              <li>
                <span className="font-medium">Top K:</span> Controls the number
                of possible next words considered at each step of the generation
                process. A higher Top K results in more diverse text, while a
                lower Top K results in more focused text.
              </li>
            </ul>
            <h2 className="text-xl font-medium mb-3">Formats</h2>
            <p className="mb-4">
              You can choose between HTML, PDF, and Markdown formats for your
              generated documentation. Each format comes in a pre-defined
              template, with functions and classes segragated from each other.
            </p>
            <ul className="list-disc list-inside mb-4 flex gap-y-2 flex-col">
              <li>
                <span className="font-medium">HTML:</span> A web-based format
                that can be viewed in any web browser. The page is navigatable
                out of the box using anchors and articles.
              </li>
              <li>
                <span className="font-medium">PDF:</span> A printable format
                that can be easily shared and viewed on any device. The page
                comes with a Table of Contents that allows the user a brief
                summary of the items.
              </li>
              <li>
                <span className="font-medium">Markdown:</span> A lightweight
                format that can be easily converted to other formats. The
                primary choice for GitHub repos.
              </li>
            </ul>
          </article>
          <article id="faqs" className="mt-10">
            <div>
              <h1 className="text-4xl font-bold mb-4 border-b-2 border-gray-300 py-5">
                FAQs
              </h1>
              <p className="font-medium mb-1">
                What language does the tool support?
              </p>
              <p className="mb-4">
                The tool currently only supports Python codebases.
              </p>
              <p className="font-medium mb-1">
                Do I need GitHub to use the tool?
              </p>
              <p className="mb-4">
                No, you do not need GitHub to use our tool. GitHub is simply an
                add-on integration to the tool to allow repositories to be used
                as project files.
              </p>
              <p className="font-medium mb-1">
                Why am i not able to log in using GitHub?
              </p>
              <p className="mb-4">
                You may have not granted the app the permissions during your
                initial linking or GitHub may be down. Please grant the app the
                necessary permissions — These permissions are necessary when
                creating your account in our system and fetching your repos. You
                can always unlink the app via GitHub once you are done using it.
              </p>
              <p className="font-medium mb-1">
                The generation is taking too long. Why is this?
              </p>
              <p className="mb-4">
                Our model, which is hosted via Huggingface Inference Endpoints,
                scales down to zero after 15mins of inactivity eg., no incoming
                requests. Booting the model back up may take a while, so please
                bear with this as it is entirely dependent on Huggingface
                Endpoints.
              </p>
              <p className="font-medium mb-1">
                A file is missing from my upload. Why is it not showing?
              </p>
              <p className="mb-4">
                Please double check that the uploaded file is indeed a Python
                file. Our system may take in your file but{" "}
                <span className="font-medium">will </span> discard your file if
                it is not a Python file. If it is a ZIP file, the system will
                initially take in all files but will only look for and process
                Python files.
              </p>
            </div>
          </article>
          {/* Scroll to top button - visible only on sm/md screens when scrolled */}
          {showScrollButton && (
            <button
              onClick={scrollToTop}
              className="hidden sm:flex md:flex fixed bottom-8 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 items-center justify-center"
              aria-label="Scroll to top"
            >
              <FaArrowUp className="text-lg" />
            </button>
          )}
        </section>
      </main>
    </>
  );
};

export default Guide;
