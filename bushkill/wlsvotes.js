//====================================================
// smokevotes.js
//
//BASED ON:
//
//Author: @ijmmai
// Name: rankings.js
// Description:
// Rankings.js will create a markdown listing of
// active witnesses ordere by weighted votes.
// Markdown is in file:"markdown-rankings.json"
//
// To keep track of previous ranking, the 'save'
// option can be used to save the current ranks.
// Ranks are in file:"prev-rankings.json"
//
// version: 0.4
//====================================================

steem.api.setOptions({ url: 'ws://188.166.99.136:8090' });
steem.config.set('address_prefix', 'WLS');
steem.config.set('chain_id', 'de999ada2ff7ed3d3d580381f229b40b5a0261aec48eb830e540080817b72866');

steem.api.getWitnessCount(function(err, result) {
  if ( err ) {
    console.log('Error getWitnessCount' + err);
  }

  steem.api.getWitnessesByVote("", result, function(err, res) {
    if( err || !res ) {
        console.log('Error Reading WitnessesByVote' + err);
    }

    var count = 0;
    // var witnesses = [];
    let witnesses = {};
    res.forEach(function(r){
      var witness = {};
      count++;
      witness.rank          = count;
      witness.name          = r.owner;
      witness.votes         = 0;
      witness.weighted_vote = r.votes;
      witness.voters        = [];

      witnesses[witness.name] = witness;
    });

    // Retrieve witness votes,
    // also keeping track of voters
    witnessVotesLeaderboard()
      .then(function(names) {
        getWitnessVotes(names)
        .then(function(list){
          var sum = 0;
          for ( var voter in list){
            list[voter].votes.forEach(function(witnessName){
              if ( witnesses[witnessName] ) {
                witnesses[witnessName].votes += 1;
                let weightInt = parseInt(list[voter].weight);
                let w = list[voter].weight

                let weightFloat = parseFloat(list[voter].weight);
                witnesses[witnessName].voters.push( { 'voter': '@'+voter, 'weight': weightFloat})
                sum++;
              }
            });
          }
          writeMarkdown(witnesses);
          console.log('Total Votes: ' + sum);
        })
        .catch(function(error){
          console.log('Error in getWitnessVotes: ' + error);
        })
    }, function(err) {
        console.error(err);
    });
  }); // end getWitnessesByVote
}); // end getWitnessCount


//===================================================================================
//    Functions
//===================================================================================

// Convert date to 'day/month/year' format
function formatDate(timestamp){
  var created = new Date(timestamp);
  var day = created.getDate();
  var month = created.getMonth() + 1;
  var year = created.getFullYear();

  return day+'/'+month+'/'+year;
}

function compare(a, b) {

  // Use toUpperCase() to ignore character casing
  const voterA = a.weight;
  const voterB = b.weight;

  let comparison = 0;
  if (voterA > voterB) {
    comparison = 1;
  } else if (voterA < voterB) {
    comparison = -1;
  }
  return comparison;
}

function writeMarkdown(witnesses) {
  // Generate markdown and save to file
  var header = '<table>\n';
  header += '<tr>\n';
  header += '  <th>Rank</th><th>Owner</th><th>Votes</th><th>Weighted Votes</th><th>Voters</th>\n';
  header += '</tr>\n';
  var txt = '';
  for (var prop in witnesses){
      var voters = '';
      witnesses[prop].voters.sort(compare)
      for(var voter of witnesses[prop].voters.reverse()) {
        voters += format('<a href="https://whaleshares.io/{}" title="{}" target="_blank">{}</a>', voter.voter, voter.weight, voter.voter) + ' '
      }
      txt += format('<tr>\n<td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>\n',
        witnesses[prop].rank, witnesses[prop].name, witnesses[prop].votes, witnesses[prop].weighted_vote, voters)
  }

  txt += '</table><br />This site is operated by Smoke.io witness <a href="https://smoke.io/~witnesses">@bbq-iguana</a>\n';

  var div = document.getElementById('witnessTable');
  div.innerHTML += header+txt;
  document.getElementById('mInfo').innerHTML= "If you find this helpful please consider voting <a href=\"https://smoke.io/~witnesses\">@bbq-iguana</a>";

}

// Get number of accounts
let countAccounts =
  new Promise(
    function (resolve, reject){
      steem.api.getAccountCount( function(err, number){
        if (err){
          reject(err);
        } else {
          resolve(number);
        }
      });
    }
  );

// Get all accountnames (per 1000)
let getAccountNames =
  function(name) {
    return new Promise(
          function(resolve, reject){
              steem.api.lookupAccounts(name, 1000, function(err, names){
                if (err){
                  reject(err);
                } else {
                  resolve(names);
                }
              });
          }
    );
  }


// Get all witnessnames voted for (per account)
let getWitnessVotes =
  function(name) {
    return new Promise(
        function(resolve, reject){
          steem.api.getAccounts(name, function(err, votes){
            if (err){
              reject(err);
            } else {
              var collectVotes = {};
              votes.forEach(function(vote){
                // Total vest * 1,000,000
                if (vote.witnesses_voted_for > 0) {
                  totalVests = vestToDecimal(vote.vesting_shares);
                  collectVotes[vote.name] = { 'votes': vote.witness_votes, 'weight': Math.round(totalVests * 1000000) }
                }
              });
              resolve(collectVotes);
            }
          });
        }
      );
  }

let vestToDecimal = function (vest) {
  try {
    return 1 * vest.replace(" VESTS", "")
  } catch (e) {

  }
}

// Main function to retrieve all info
let witnessVotesLeaderboard = function () {
    let list = [];
    const fn = function (name, number) {
        return getAccountNames(name).then(function (names) {
            names.forEach(function (el) {
                list.push(el);
            });

            if(list.length >= number || names.length == 0) {
                return list;
            }

            return fn(list.pop(), number);
        });
    }
    return countAccounts.then(function (number) {
        return fn('', number);
    });
}
