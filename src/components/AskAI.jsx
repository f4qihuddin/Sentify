import { useEffect, useState } from "react";
import ActionButton from "./ActionButton";
import FileButton from "./FileButton";
const CHAT_API_URL =
  import.meta.env.VITE_CHAT_API_URL ?? "http://localhost:8000/chat";
const CHAT_HISTORY_API_URL =
  import.meta.env.VITE_CHAT_HISTORY_API_URL ??
  "http://localhost:8000/chat/history";

function groupChatHistory(rows) {
  const dateGroups = new Map();

  for (const row of rows) {
    const date = row.tanggal?.trim();
    const sessionName = row.sesi_chat?.trim();
    const question = row.pertanyaan_user?.trim();
    const response = row.respon_chatbot?.trim();

    if (!date || !sessionName || !question || !response) {
      continue;
    }

    if (!dateGroups.has(date)) {
      dateGroups.set(date, new Map());
    }

    const sessionGroups = dateGroups.get(date);

    if (!sessionGroups.has(sessionName)) {
      sessionGroups.set(sessionName, []);
    }

    sessionGroups.get(sessionName).push({
      question,
      response,
    });
  }

  return Array.from(dateGroups.entries())
    .sort(([dateA], [dateB]) => {
      return dateB.localeCompare(dateA);
    })
    .map(([date, sessions]) => ({
      date,

      sessions: Array.from(sessions.entries()).map(([name, messages]) => ({
        id: `${date}-${name}`,
        name,
        messages,
      })),
    }));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getUniqueSessionName(baseName, sessions, excludedSessionId = "") {
  const sessionNames = new Set(sessions.map((session) => session.name));
  const excludedSession = sessions.find(
    (session) => session.id === excludedSessionId,
  );

  if (excludedSession) {
    sessionNames.delete(excludedSession.name);
  }

  if (!sessionNames.has(baseName)) {
    return baseName;
  }

  let sessionNumber = 2;

  while (sessionNames.has(`${baseName} ${sessionNumber}`)) {
    sessionNumber += 1;
  }

  return `${baseName} ${sessionNumber}`;
}

function getNewSessionName(sessions) {
  return getUniqueSessionName("New Chat", sessions);
}

function findActiveSession(chatHistory, activeSessionId) {
  for (const dateGroup of chatHistory) {
    const session = dateGroup.sessions.find(
      (item) => item.id === activeSessionId,
    );

    if (session) {
      return {
        ...session,
        date: dateGroup.date,
      };
    }
  }

  return null;
}

function buildConversationMessages(session) {
  if (!session) {
    return [];
  }

  return session.messages.flatMap((message) => [
    {
      role: "user",
      content: message.question,
    },
    {
      role: "assistant",
      content: message.response,
    },
  ]);
}

function AskAI() {
  const [chatHistory, setChatHistory] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // State percakapan aktif dengan Ollama.
  const [conversationMessages, setConversationMessages] = useState([]);
  const [sessionTitle, setSessionTitle] = useState("");

  const [messageInput, setMessageInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    async function loadChatHistory() {
      try {
        setIsLoading(true);
        setHistoryError("");

        const response = await fetch(CHAT_HISTORY_API_URL);

        if (!response.ok) {
          throw new Error(`Failed to read chat history: ${response.status}`);
        }

        if (!response.ok) {
          throw new Error(`Failed to read history: ${response.status}`);
        }

        const rows = await response.json();
        const groupedHistory = groupChatHistory(rows);

        setChatHistory(groupedHistory);

        const firstSession = groupedHistory[0]?.sessions[0];

        if (firstSession) {
          setActiveSessionId(firstSession.id);
          setConversationMessages(buildConversationMessages(firstSession));
        }
      } catch (error) {
        console.error(error);
        setHistoryError(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadChatHistory();
  }, []);

  const activeSession = findActiveSession(chatHistory, activeSessionId);

  async function handleSendMessage(event) {
    event.preventDefault();

    const messageText = messageInput.trim();
    const question = messageText || `Attached file: ${selectedFile.name}`;
    setSessionTitle(messageText);

    if ((!messageText && !selectedFile) || isSending) {
      return;
    }

    // Simpan pesan sebelumnya untuk dikirim sebagai history.
    const previousMessages = conversationMessages;
    const date = activeSession?.date ?? getTodayDateKey();
    const currentDateGroup = chatHistory.find((item) => item.date === date);
    const isNewEmptySession =
      activeSession &&
      activeSession.messages.length === 0 &&
      activeSession.name.startsWith("New Chat");
    const sessionName = isNewEmptySession
      ? getUniqueSessionName(
          question,
          currentDateGroup?.sessions ?? [],
          activeSession.id,
        )
      : (activeSession?.name ?? question);
    const sessionId = `${date}-${sessionName}`;

    const userMessage = {
      role: "user",
      content: question,
      attachedFile: selectedFile
        ? {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
          }
        : null,
    };

    // Tampilkan pertanyaan langsung di UI.
    setConversationMessages([...previousMessages, userMessage]);

    setMessageInput("");
    setSelectedFile(null);
    setSendError("");
    setIsSending(true);

    try {
      const response = await fetch(CHAT_API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question,
          session_name: sessionName,
          history: previousMessages.slice(-10).map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ?? `Request failed with status ${response.status}`,
        );
      }

      const assistantMessage = {
        role: "assistant",
        content: result.answer,
      };

      setConversationMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);

      setChatHistory((currentHistory) => {
        const nextHistory = currentHistory.map((dateGroup) => ({
          ...dateGroup,
          sessions: dateGroup.sessions.map((session) => ({
            ...session,
            messages: [...session.messages],
          })),
        }));

        let dateGroup = nextHistory.find((item) => item.date === date);

        if (!dateGroup) {
          dateGroup = {
            date,
            sessions: [],
          };

          nextHistory.unshift(dateGroup);
        }

        let session = dateGroup.sessions.find(
          (item) => item.id === activeSessionId,
        );

        if (!session) {
          session = dateGroup.sessions.find((item) => item.id === sessionId);
        }

        if (!session) {
          session = {
            id: sessionId,
            name: sessionName,
            messages: [],
          };

          dateGroup.sessions.unshift(session);
        }

        session.id = sessionId;
        session.name = sessionName;
        session.messages.push({
          question,
          response: result.answer,
        });

        return nextHistory;
      });

      setActiveSessionId(sessionId);
    } catch (error) {
      console.error("Ask AI failed:", error);

      setSendError(error.message || "Chatbot cannot be reached.");
    } finally {
      setIsSending(false);
    }
  }

  function handleFileSelect(file) {
    setSelectedFile(file);
    setSendError("");
  }

  function handleRemoveSelectedFile() {
    setSelectedFile(null);
  }

  function handleNewChat(date) {
    const currentDateGroup = chatHistory.find((item) => item.date === date);
    const sessionName = getNewSessionName(currentDateGroup?.sessions ?? []);
    const newSession = {
      id: `${date}-${sessionName}`,
      name: sessionName,
      messages: [],
    };

    setChatHistory((currentHistory) => {
      const nextHistory = currentHistory.map((dateGroup) => ({
        ...dateGroup,
        sessions: dateGroup.sessions.map((session) => ({
          ...session,
          messages: [...session.messages],
        })),
      }));

      let dateGroup = nextHistory.find((item) => item.date === date);

      if (!dateGroup) {
        dateGroup = {
          date,
          sessions: [],
        };

        nextHistory.unshift(dateGroup);
      }

      dateGroup.sessions.unshift(newSession);

      return nextHistory;
    });

    setActiveSessionId(newSession.id);
    setConversationMessages([]);
    setMessageInput("");
    setSelectedFile(null);
    setSessionTitle("");
    setSendError("");
  }

  const canSend =
    !isSending && (messageInput.trim().length > 0 || Boolean(selectedFile));

  return (
    <div className="ask-ai-container">
      <aside className="chat-history">
        <p className="large-semibold-text">Chat History</p>

        <div className="chat-history-list">
          {isLoading && (
            <p className="chat-history-status">Memuat history...</p>
          )}

          {historyError && <p className="chat-history-error">{historyError}</p>}

          {!isLoading &&
            !historyError &&
            chatHistory.map((dateGroup) => (
              <section className="chat-history-date-group" key={dateGroup.date}>
                <div className="chat-history-group">
                  <p className="chat-history-date">
                    {formatDate(dateGroup.date)}
                  </p>
                  <button
                    type="button"
                    className="new-chat-button"
                    onClick={() => {
                      handleNewChat(dateGroup.date);
                    }}
                  >
                    <img src="src/assets/add_chat.svg" alt="" />
                  </button>
                </div>

                <div className="chat-history-sessions">
                  {dateGroup.sessions.map((session) => (
                    <button
                      type="button"
                      key={session.id}
                      className={
                        session.id === activeSessionId
                          ? "chat-session-button active"
                          : "chat-session-button"
                      }
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setConversationMessages(
                          buildConversationMessages(session),
                        );
                        setSendError("");
                      }}
                    >
                      {session.name}
                    </button>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </aside>

      <main className="chatbot-interaction">
        <div className="conversation-container">
          <div className="conversation-messages">
            {conversationMessages.length === 0 && (
              <div className="chatbot-greeting">
                <div className="chatbot-greeting-bubble">
                  <p className="larger-semibold-text">
                    Hello User, what would you like to ask?
                  </p>
                </div>
                <img src="src/assets/bot.svg" />
              </div>
            )}

            {conversationMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "chat-message user-message"
                    : "chat-message chatbot-message"
                }
              >
                {message.content}
                {message.attachedFile && (
                  <span className="message-file-chip">
                    <span className="message-file-icon">CSV</span>
                    {message.attachedFile.name}
                  </span>
                )}
              </div>
            ))}

            {isSending && (
              <div className="chat-message chatbot-message typing-message">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            )}

            {sendError && (
              <p className="chat-send-error" role="alert">
                {sendError}
              </p>
            )}
          </div>
        </div>

        <form className="user-input" onSubmit={handleSendMessage}>
          {selectedFile && (
            <div className="selected-file-preview">
              <img src="src/assets/csv-outline-rounded.svg" />
              <span className="selected-file-name">{selectedFile.name}</span>
              <button
                type="button"
                className="selected-file-remove"
                onClick={handleRemoveSelectedFile}
                aria-label="Remove selected file"
              >
                <img src="src/assets/close-small-rounded.svg" />
              </button>
            </div>
          )}

          <div className="user-input-row">
            <FileButton
              logo="/src/assets/attachment.svg"
              accept=".csv,text/csv"
              onFileSelect={handleFileSelect}
              className="chat-file-button"
              disabled={isSending}
              ariaLabel="Attach file"
            />

            <input
              type="text"
              placeholder="Ask here"
              value={messageInput}
              onChange={(event) => {
                setMessageInput(event.target.value);
              }}
              disabled={isSending}
            />

            <ActionButton
              type="submit"
              logo="/src/assets/send.svg"
              className="user-input-button"
              state={canSend}
            />
          </div>
        </form>
      </main>
    </div>
  );
}

export default AskAI;
