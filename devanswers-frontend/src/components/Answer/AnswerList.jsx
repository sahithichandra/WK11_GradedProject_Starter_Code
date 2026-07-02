import { useState } from 'react';
import { Card, Row, Col, Button, Form } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { FaUser, FaClock, FaEdit } from 'react-icons/fa';
import { voteAnswer, updateAnswer } from '../../reducers/questionSlice';
import { formatDate } from '../../utils/timeFormat';
import VoteButtons from '../Shared/VoteButtons';
import { summarizeAnswers } from '../../services/aiService';
import './AnswerList.css';

const AnswerList = ({ answers, question }) => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.user.userInfo);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const startEditAnswer = (answer) => {
    setEditingId(answer._id);
    setEditText(answer.answerText);
  };

  const handleSaveAnswer = async (answerId) => {
    if (!editText.trim()) {
      alert('Answer cannot be empty.');
      return;
    }
    try {
      await dispatch(updateAnswer({ answerId, answerText: editText })).unwrap();
      setEditingId(null);
    } catch (error) {
      alert(`Failed to update answer: ${error}`);
    }
  };

  const handleSummarize = async () => {
    setSummaryLoading(true);
    try {
      const data = await summarizeAnswers(question?.title, question?.description, answers, userInfo?.token);
      setSummary(data.summary);
      setSummaryVisible(true);
    } catch (err) {
      alert('Failed to summarize answers. Please try again.');
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <Card className="alist-card">
      <Card.Body className="p-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="mb-0 alist-title">
            {answers?.length || 0} {answers?.length === 1 ? 'Answer' : 'Answers'}
          </h4>
          {answers?.length >= 3 && !summaryVisible && !!userInfo && (
            <Button
              size="sm"
              variant="outline-secondary"
              className="alist-summarize-btn"
              onClick={handleSummarize}
              disabled={summaryLoading}
            >
              {summaryLoading ? 'Summarizing...' : 'Summarize Answers'}
            </Button>
          )}
        </div>

        {summaryVisible && summary && (
          <div className="alist-summary-banner mb-3">
            <div className="alist-summary-header">
              <span className="alist-summary-label">AI Summary</span>
              <Button
                size="sm"
                variant="link"
                className="alist-summary-dismiss"
                onClick={() => setSummaryVisible(false)}
              >
                Dismiss
              </Button>
            </div>
            <p className="alist-summary-text mb-0">{summary}</p>
          </div>
        )}

        {answers && answers.length > 0 ? (
          answers.map((answer) => (
            <Card
              key={answer._id}
              className="mb-1 alist-answer-card"
            >
              <Card.Body className="p-2">
                <Row>
                  {/* Voting Controls */}
                  <Col xs="auto" className="d-flex flex-column align-items-center align-self-start pe-3">
                    <VoteButtons
                      voteCount={answer.voteCount}
                      authorId={answer.author?._id}
                      onVote={(voteType) => dispatch(voteAnswer({ answer, voteType }))}
                      variant="outline-secondary"
                      upClassName="alist-vote-btn alist-vote-btn-up"
                      downClassName="alist-vote-btn alist-vote-btn-down"
                      countClassName="alist-vote-count"
                      upIconClassName="alist-icon-up"
                      downIconClassName="alist-icon-down"
                      itemType="answer"
                    />
                  </Col>

                  {/* Answer Content */}
                  <Col>
                    {editingId === answer._id ? (
                      <Form.Group className="mb-2">
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          aria-label="Edit answer"
                        />
                        <div className="d-flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSaveAnswer(answer._id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </Form.Group>
                    ) : (
                      <div className="mb-2 alist-content">
                        {answer.answerText}
                      </div>
                    )}
                    <div className="mt-2 d-flex align-items-center gap-2 alist-meta">
                      <FaUser className="alist-icon-sm" />
                      <span>Answered by </span>
                      <strong className="alist-author">{answer.author?.name}</strong>
                      {answer.createdAt && (
                        <>
                          <span className="mx-2">•</span>
                          <FaClock className="alist-icon-sm" />
                          <span>{formatDate(answer.createdAt)}</span>
                        </>
                      )}
                      {answer.isEdited && (
                        <span className="text-muted fst-italic small">(edited)</span>
                      )}
                      {answer.author?._id === userInfo?.userId &&
                        editingId !== answer._id && (
                          <Button
                            variant="link"
                            className="p-0 text-decoration-none ms-1 alist-edit-btn"
                            onClick={() => startEditAnswer(answer)}
                            aria-label="Edit answer"
                            title="Edit answer"
                          >
                            <FaEdit className="alist-icon-sm" />
                          </Button>
                        )}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="mb-0 alist-meta">No answers yet. Be the first to answer!</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AnswerList;
