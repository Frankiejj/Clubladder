
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";

export const sendMonthlyMatchEmails = (players: Player[], challenges: Challenge[]) => {
  // This would integrate with an email service like SendGrid, Mailgun, etc.
  // For now, we'll just log what would be sent
  
  players.forEach(player => {
    const playerMatches = challenges.filter(
      challenge => 
        challenge.challengerId === player.id || 
        challenge.challengedId === player.id
    );

    if (playerMatches.length > 0) {
      const emailContent = generateMonthlyEmailContent(player, playerMatches, players);
      console.log(`Would send email to ${player.email}:`, emailContent);
      
      // In a real implementation, you would call your email service here:
      // await emailService.send({
      //   to: player.email,
      //   subject: emailContent.subject,
      //   html: emailContent.html
      // });
    }
  });
};

const generateMonthlyEmailContent = (player: Player, matches: Challenge[], allPlayers: Player[]) => {
  const monthName = new Date().toLocaleString('default', { month: 'long' });
  
const matchList = matches.map(match => {
  const opponentId = match.challengerId === player.id ? match.challengedId : match.challengerId;
  const opponent = allPlayers.find(p => p.id === opponentId);
  return `
    <li>
      <strong>vs ${opponent?.name}</strong> (Rank #${opponent?.rank ?? "?"})
      ${match.scheduledDate ? `- Scheduled: ${match.scheduledDate}` : ""}
      ${opponent?.phone ? ` - Phone: ${opponent.phone}` : ""}
      ${opponent?.email ? ` - Email: ${opponent.email}` : ""}
    </li>yes 
  `;
}).join("");

  return {
    subject: `${monthName} Tennis Ladder Matches - ${player.name}`,
    html: `
      <h2>Your ${monthName} Tennis Ladder Matches</h2>
      <p>Hello ${player.name},</p>
      <p>Here are your scheduled matches for ${monthName}:</p>
      <ul>
        ${matchList}
      </ul>
      <p>Please coordinate with your opponents to schedule your matches. You can use the My Matches page on the ladder website to track results and communicate with your opponents.</p>
      <p>Good luck!</p>
      <p>Riverside Tennis Club</p>
    `
  };
};

// Function to be called at the beginning of each month
export const scheduleMonthlyEmails = () => {
  // This would be called by a cron job or scheduled task
  // For demonstration purposes, we'll just log when it would run
  console.log("Monthly email scheduling would run here at the beginning of each month");
};
