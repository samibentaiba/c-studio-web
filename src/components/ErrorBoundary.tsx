"use client";
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in React:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8">
          <h1 className="text-3xl font-bold mb-4 text-red-500">Something went wrong.</h1>
          <p className="mb-4 text-gray-300">The application encountered an unexpected error.</p>
          <div className="bg-gray-800 p-4 rounded-lg mb-6 w-full max-w-2xl overflow-auto text-sm font-mono text-gray-400">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
          >
            Reload Window
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
