"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { midiSongs } from "./PlayList";
import { MIDIPlayer as MIDIPlayerJS } from "./MidiPlayer";
import { DraggableWindow } from "./DraggabledWindow";

export interface MIDISong {
	tracks: MIDITrack[];
	beats: MIDIBeat[];
	duration: number;
}

export interface MIDITrack {
	program: number;
	notes: MIDINote[];
	volume: number;
	info: {
		variable: string;
	};
	id: number;
}

export interface MIDIBeat {
	n: number;
	notes: MIDINote[];
	volume: number;
	info: {
		variable: string;
	};
	id: number;
}

export interface MIDINote {
	when: number;
	pitch: number;
	duration: number;
	slides?: any; // You might want to define a more specific type for slides
}

export interface MIDIPlayer {
	play: () => void;
	pause: () => void;
	stop: () => void;
	getContext: () => any; // You might want to use a more specific type for the Web Audio API context
	getCurrentSong: () => MIDISong | null;
	getPosition: () => number;
	setPosition: (position: number) => void;
	setVolume: (volume: number) => void;
	setInstrument: (value: number) => void;
	openFile: (fileObj: ArrayBuffer) => void;
	handleExample: (path: string) => void;
	ontick?: (song: MIDISong, position: number) => void;
	STOPPED: string;
	PLAYING: string;
	PAUSED: string;
}

export interface MIDIPlayerConstructor {
	(
		fileInput: string | HTMLInputElement,
		onload: (song: MIDISong) => void,
		ontick: (song: MIDISong, position: number) => void,
	): MIDIPlayer;
}

declare global {
	interface Window {
		MIDIPlayer: MIDIPlayerConstructor;
	}
}

declare global {
	interface Window {
		MIDIFile: unknown;
	}
}

interface Song {
	duration: number;
	url?: string;
}

interface LoadedSong {
	index: number;
	title: string;
	artist: string;
	duration: number;
}

export const RetroMusicPlayer: React.FC = () => {
	const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isLooping, setIsLooping] = useState(false);
	const [loadedSong, setLoadedSong] = useState<LoadedSong | null>(null);
	const playerRef = useRef<MIDIPlayer | null>(null);

	const createNewPlayer = useCallback((songIndex: number) => {
		if (typeof window !== "undefined") {
			if (playerRef.current) {
				playerRef.current.stop();
			}
			playerRef.current = MIDIPlayerJS(
				null,
				(song: Song) => {
					handleSongLoad(song, songIndex);
				},
				(_: Song, position: number) => setCurrentTime(position),
			);
			playerRef.current.handleExample(midiSongs[songIndex].url);
		} else {
			setError("Failed to load MIDI player. Please refresh the page.");
			setIsLoading(false);
		}
	}, []);

	const handleSongLoad = useCallback((song: Song, index: number) => {
		console.log(`Song loaded: ${midiSongs[index].title}`);
		setLoadedSong({
			index,
			title: midiSongs[index].title,
			artist: midiSongs[index].artist,
			duration: song.duration,
		});
		setIsLoading(false);
		setCurrentSongIndex(index);
	}, []);

	useEffect(() => {
		createNewPlayer(0);
	}, [createNewPlayer]);

	const handlePlayPause = useCallback(() => {
		if (playerRef.current && loadedSong) {
			if (isPlaying) {
				playerRef.current.pause();
			} else {
				playerRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	}, [isPlaying, loadedSong]);

	const handlePrevious = useCallback(() => {
		if (currentSongIndex !== null) {
			const newIndex = (currentSongIndex - 1 + midiSongs.length) % midiSongs.length;
			setCurrentSongIndex(newIndex);
			createNewPlayer(newIndex);
			setCurrentTime(0);
			setIsPlaying(false);
		}
	}, [currentSongIndex, createNewPlayer]);

	const handleNext = useCallback(() => {
		if (currentSongIndex !== null) {
			const newIndex = (currentSongIndex + 1) % midiSongs.length;
			setCurrentSongIndex(newIndex);
			createNewPlayer(newIndex);
			setCurrentTime(0);
			setIsPlaying(false);
		}
	}, [currentSongIndex, createNewPlayer]);

	const handleSongEnd = useCallback(() => {
		if (isLooping) {
			if (playerRef.current) {
				playerRef.current.setPosition(0);
				playerRef.current.play();
				setCurrentTime(0);
			}
		} else {
			handleNext();
		}
	}, [isLooping, handleNext]);

	useEffect(() => {
		if (playerRef.current) {
			playerRef.current.ontick = (_, position) => {
				setCurrentTime(position);
				if (loadedSong && position >= loadedSong.duration) {
					handleSongEnd();
				}
			};
		}
	}, [loadedSong, handleSongEnd]);
	const toggleLooping = () => {
		setIsLooping(!isLooping);
	};
	const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const newPosition = parseFloat(e.target.value);
		if (playerRef.current) {
			playerRef.current.setPosition(newPosition);
			setCurrentTime(newPosition);
		}
	}, []);

	const handleSongSelect = useCallback(
		(index: number) => {
			setCurrentSongIndex(index);
			createNewPlayer(index);
			setCurrentTime(0);
			setIsPlaying(false);
		},
		[createNewPlayer],
	);

	const formatTime = (time: number) => {
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	if (isLoading && !loadedSong) {
		return (
			<DraggableWindow title="Xtreme Midi" randoTranslate={false} style={{ bottom: "0px" }}>
				<div>
					<p className="">Loading MIDI Player...</p>
				</div>
			</DraggableWindow>
		);
	}

	if (error) {
		return (
			<DraggableWindow title="Xtreme Midi" randoTranslate={false} style={{ bottom: "0px" }}>
				<p>{error}</p>
			</DraggableWindow>
		);
	}

	return (
		<DraggableWindow
			title="Xtreme Midi"
			randoTranslate={false}
			style={{
				bottom: "20px",
				right: "20px",
				zIndex: 90000,
			}}>
			<div>
				<p>{loadedSong?.title || "No song loaded"}</p>
				<p>{loadedSong?.artist || ""}</p>
					<p>
						{formatTime(currentTime)} / {formatTime(loadedSong?.duration || 0)}
					</p>
					<input
						type="range"
						min="0"
						max={loadedSong?.duration || 0}
						value={currentTime}
						onChange={handleSeek}
						className="mb-4 w-full"
					/>		
				<div>
					<button
					onClick={handlePrevious}
					disabled={!loadedSong}
					style={{color: 'var(--secondary, "black")'}}
					>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polygon points="19 20 9 12 19 4 19 20"></polygon>
						<line x1="5" y1="19" x2="5" y2="5"></line>
					</svg>
					</button>
					<button
					onClick={handlePlayPause}
					disabled={!loadedSong}
					style={{color: 'var(--secondary, "black")'}}
					>
					{isPlaying ? (
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<rect x="6" y="4" width="4" height="16"></rect>
						<rect x="14" y="4" width="4" height="16"></rect>
						</svg>
					) : (
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polygon points="5 3 19 12 5 21 5 3"></polygon>
						</svg>
					)}
					</button>
					<button
					onClick={handleNext}
					disabled={!loadedSong}
					style={{color: 'var(--secondary, "black")'}}
					>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polygon points="5 4 15 12 5 20 5 4"></polygon>
						<line x1="19" y1="5" x2="19" y2="19"></line>
					</svg>
					</button>
					<button
					onClick={toggleLooping}
					disabled={!loadedSong}
					style={{color: 'var(--secondary, "black")'}}
					className={`${isLooping ? 'text-blue-500' : ''}`}
					>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="17 1 21 5 17 9"></polyline>
						<path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
						<polyline points="7 23 3 19 7 15"></polyline>
						<path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
					</svg>
					</button>
				</div>
				<h3>Playlist</h3>
				<div className="sunken-panel" style={{height: "120px", width: "fit-content"}}>
				<table className="interactive">
					<thead>
						<tr>
							<th>Title</th>
							<th>Artist</th>
						</tr>
					</thead>
					<tbody>
					{midiSongs.map((song, index) => (
							<tr
							className={`${index === currentSongIndex ? "highlighted" : ""}`}
							>
								<td
									key={index}
									onClick={() => handleSongSelect(index)}
								>
									{song.title}
								</td>
								<td>
									{song.artist}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				</div>
			</div>
		</DraggableWindow>
	);
};
