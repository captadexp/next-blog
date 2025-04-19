import { h } from 'preact';
import { memo, useEffect, useState } from 'preact/compat';
import readability from 'text-readability';

interface ReadabilityScoreProps {
    content: string;
}

const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').trim();
};

const ReadabilityScore = memo(({ content }: ReadabilityScoreProps) => {
    const [score, setScore] = useState<number | null>(null);
    const [grade, setGrade] = useState<number | null>(null);
    const [difficulty, setDifficulty] = useState('');

    useEffect(() => {
        if (!content) {
            setScore(null);
            setGrade(null);
            setDifficulty('');
            return;
        }

        const plainText = stripHtml(content);

        // Avoid processing short or empty text
        if (plainText.split(' ').length < 10) {
            setScore(0);
            setGrade(0);
            setDifficulty('Too short');
            return;
        }

        let readabilityScore = readability.fleschReadingEase(plainText);
        let gradeLevel = readability.fleschKincaidGrade(plainText);

        if (isNaN(readabilityScore)) readabilityScore = 0;
        if (isNaN(gradeLevel)) gradeLevel = 0;

        // Clamp values to valid ranges
        readabilityScore = Math.max(0, Math.min(100, readabilityScore));
        gradeLevel = Math.max(0, Math.min(20, gradeLevel));

        setScore(Math.round(readabilityScore * 10) / 10);
        setGrade(Math.round(gradeLevel * 10) / 10);

        if (readabilityScore >= 90) {
            setDifficulty('Very Easy');
        } else if (readabilityScore >= 80) {
            setDifficulty('Easy');
        } else if (readabilityScore >= 70) {
            setDifficulty('Fairly Easy');
        } else if (readabilityScore >= 60) {
            setDifficulty('Standard');
        } else if (readabilityScore >= 50) {
            setDifficulty('Fairly Difficult');
        } else if (readabilityScore >= 30) {
            setDifficulty('Difficult');
        } else {
            setDifficulty('Very Difficult');
        }
    }, [content]);

    if (score === null) return null;

    return (
        <div className="flex items-center space-x-2 text-sm mt-1">
            <div className="font-medium">Readability:</div>
            <div className="flex items-center">
        <span
            className={`font-bold ${
                score >= 60
                    ? 'text-green-600'
                    : score >= 30
                        ? 'text-yellow-600'
                        : 'text-red-600'
            }`}
        >
          {score}
        </span>
                <span className="mx-1">-</span>
                <span className="italic">{difficulty}</span>
                <span className="mx-1 text-gray-500">|</span>
                <span className="text-gray-600">Grade Level: {grade}</span>
            </div>
        </div>
    );
});

export default ReadabilityScore;